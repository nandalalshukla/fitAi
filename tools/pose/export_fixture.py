import json, sys, math
import numpy as np
sys.path.insert(0, __import__('os').path.dirname(__file__))
import blazepose_ref as R
from ai_edge_litert.interpreter import Interpreter
from skimage import data
img=data.astronaut(); H,W,_=img.shape
r=R.run(img, sys.argv[1], sys.argv[2])
# raw landmark output again for the fixture
cx,cy,size,rot=r['roi']
lm=Interpreter(model_path=sys.argv[2]); lm.allocate_tensors()
lm.set_tensor(lm.get_input_details()[0]['index'], R.sample(img,cx,cy,size,rot,256,(0,1))); lm.invoke()
lo={d['name']:d['index'] for d in lm.get_output_details()}
raw=lm.get_tensor(lo['Identity'])[0]
# small sampler fixture: 6x4 image, rotated ROI
small=(np.arange(4*6*3).reshape(4,6,3)*3 % 256).astype(np.uint8)
samp=R.sample(small, 3.0, 2.0, 4.0, 0.5, 4, (0,1))[0]
fx=dict(
  image=dict(width=W,height=H),
  detector=dict(bestIndex=r['best'], rawBox=[float(v) for v in r['det_raw']], score=r['det_score'],
                expectedKeypointsPx=[[float(a),float(b)] for a,b in r['det_kps']]),
  roi=dict(cx=float(cx),cy=float(cy),size=float(size),rotation=float(rot)),
  landmarks=dict(raw=[round(float(v),5) for v in raw], poseFlag=r['flag'],
    expected=[dict(x=round(p['x'],5),y=round(p['y'],5),visibility=round(p['vis'],4)) for p in r['landmarks'][:33]]),
  sampler=dict(width=6,height=4,pixels=[int(v) for v in small.reshape(-1)],roi=[3.0,2.0,4.0,0.5],size=4,
               expected=[round(float(v),6) for v in samp.reshape(-1)]),
)
json.dump(fx, open(sys.argv[3],'w'), indent=None, separators=(',',':'), default=float)
print('wrote', sys.argv[3])
