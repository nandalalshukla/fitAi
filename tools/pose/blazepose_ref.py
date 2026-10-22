"""usage: python tools/pose/export_fixture.py <detector.tflite> <landmarks.tflite> <out.json>

Reference BlazePose (MediaPipe pose landmarker) pipeline in numpy, used to
validate the TypeScript port. Follows MediaPipe's pose_detection + pose_landmark graphs."""
import json, math, sys
import numpy as np
from ai_edge_litert.interpreter import Interpreter
from PIL import Image, ImageDraw

def anchors():
    strides=[8,16,32,32,32]; out=[]; layer=0; n=len(strides)
    min_s,max_s=0.1484375,0.75
    while layer<n:
        sizes=0
        last=layer
        while last<n and strides[last]==strides[layer]:
            sizes+=2  # aspect 1.0 + interpolated scale
            last+=1
        fm=math.ceil(224/strides[layer])
        for y in range(fm):
            for x in range(fm):
                for _ in range(sizes):
                    out.append(((x+0.5)/fm,(y+0.5)/fm))
        layer=last
    return np.array(out,dtype=np.float32)

def sample(img, cx, cy, size, rot, n, rng):
    """img HxWx3 uint8, roi in pixels; nearest sampling; zero border."""
    H,W,_=img.shape; out=np.zeros((n,n,3),np.float32)
    c,s=math.cos(rot),math.sin(rot)
    for i in range(n):
        for j in range(n):
            u=(j+0.5)/n-0.5; v=(i+0.5)/n-0.5
            px=cx+(u*c - v*s)*size; py=cy+(u*s + v*c)*size
            xi=int(math.floor(px)); yi=int(math.floor(py))
            if 0<=xi<W and 0<=yi<H: out[i,j]=img[yi,xi]
    lo,hi=rng
    return (out/255.0*(hi-lo)+lo)[None]

def roi_from_points(p0,p1,scale=1.25):
    # p0,p1 in pixels; MediaPipe AlignmentPointsRectsCalculator, target angle 90deg
    dist=math.hypot(p1[0]-p0[0],p1[1]-p0[1])
    rot=math.pi/2 - math.atan2(-(p1[1]-p0[1]), p1[0]-p0[0])
    rot=rot-2*math.pi*math.floor((rot+math.pi)/(2*math.pi))
    return p0[0],p0[1],2*dist*scale,rot

def sigmoid(x): return 1/(1+np.exp(-x))

def run(img, det_path, lm_path):
    H,W,_=img.shape
    det=Interpreter(model_path=det_path); det.allocate_tensors()
    side=max(W,H)
    det.set_tensor(det.get_input_details()[0]['index'], sample(img,W/2,H/2,side,0,224,(-1,1)))
    det.invoke()
    o=det.get_output_details()
    boxes=det.get_tensor(o[0]['index'])[0]; scores=det.get_tensor(o[1]['index'])[0,:,0]
    a=anchors(); assert len(a)==2254
    sc=sigmoid(np.clip(scores,-100,100)); best=int(np.argmax(sc))
    raw=boxes[best]
    # keypoints in letterboxed-normalized coords -> image pixels
    kps=[]
    for k in range(4):
        kx=raw[4+2*k]/224+a[best][0]; ky=raw[5+2*k]/224+a[best][1]
        kps.append(((kx-0.5)*side+W/2,(ky-0.5)*side+H/2))
    cx,cy,size,rot=roi_from_points(kps[0],kps[1])
    lm=Interpreter(model_path=lm_path); lm.allocate_tensors()
    lm.set_tensor(lm.get_input_details()[0]['index'], sample(img,cx,cy,size,rot,256,(0,1)))
    lm.invoke()
    lo={d['name']:d['index'] for d in lm.get_output_details()}
    l=lm.get_tensor(lo['Identity'])[0].reshape(39,5); flag=float(lm.get_tensor(lo['Identity_1'])[0,0])
    c,s=math.cos(rot),math.sin(rot); pts=[]
    for x,y,z,vis,pres in l:
        u=x/256-0.5; v=y/256-0.5
        pts.append(dict(x=(cx+(u*c-v*s)*size)/W, y=(cy+(u*s+v*c)*size)/H, vis=float(sigmoid(vis)), pres=float(sigmoid(pres))))
    return dict(det_score=float(sc[best]), best=best, det_raw=raw.tolist(), det_kps=kps, roi=[cx,cy,size,rot], flag=flag, landmarks=pts)

if __name__=='__main__':
    from skimage import data
    img=data.astronaut()
    r=run(img, sys.argv[1], sys.argv[2])
    print(json.dumps({k:v for k,v in r.items() if k!="landmarks"}, indent=1, default=float))
    names=['nose','l_eye_in','l_eye','l_eye_out','r_eye_in','r_eye','r_eye_out','l_ear','r_ear','mouth_l','mouth_r','l_shoulder','r_shoulder','l_elbow','r_elbow','l_wrist','r_wrist']
    for i,n in enumerate(names): p=r['landmarks'][i]; print(f"{n:12s} x={p['x']:.3f} y={p['y']:.3f} vis={p['vis']:.2f}")
    im=Image.fromarray(img); d=ImageDraw.Draw(im)
    for p in r['landmarks'][:33]:
        X,Y=p['x']*512,p['y']*512; d.ellipse([X-4,Y-4,X+4,Y+4],fill=(0,255,0) if p['vis']>0.5 else (255,0,0))
    cx,cy,size,rot=r['roi']
    corners=[]
    for u,v in [(-.5,-.5),(.5,-.5),(.5,.5),(-.5,.5)]:
        corners.append((cx+(u*math.cos(rot)-v*math.sin(rot))*size, cy+(u*math.sin(rot)+v*math.cos(rot))*size))
    d.polygon(corners,outline=(255,255,0))
    im.save(sys.argv[3])
