"""뉴욕 시내 사람 키트 — 실제 사람 비율(키 1.75 m, 머리 7.5등신)의 몸을 블렌더 스킨 모디파이어로 빚어 부위별로 내보낸다.

실행:  python3 3d/ride/blender/nyc_people.py      (nyc_kit.py 와 같은 bpy 모듈)
출력:  3d/ride/nyc/people.json · people.bin  — 부위마다 (위치 · 노멀 · UV · 그늘 색) + 인덱스. 그늘(AO)은 꼭짓점 색으로 굽는다.

부위와 관절(게임에서 이 원점을 기준으로 돌린다):
  torso · head · hair_s(짧은 머리) · hair_l(긴 머리) · coat(긴 외투 자락)  — 몸 원점(발바닥 가운데)
  arm(오른팔; 왼팔은 거울) · hand                                              — 어깨 관절이 원점
  thigh                                                                          — 엉덩이 관절이 원점
  shin(신발 포함, 신발 꼭짓점은 어둡게)                                        — 무릎이 원점
블렌더 +Y = 사람 앞 = 게임 -Z. 단위 m (게임에서 1.23 배).
"""
import bpy, bmesh, math, os, sys, json
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import nyc_kit as K
from nyc_props import bake_vertex_ao

J = {'hip': (.092, 0, .93), 'knee': (0, .01, -.45), 'shoulder': (.2, -.01, 1.43)}   # 관절 위치 (부위 원점끼리의 차이)

def skin(name, pts, edges, radii, m, subd=1, root=0):
    """점 · 선 뼈대에 반지름(rx, ry)을 주고 스킨 모디파이어 + 서브디비전으로 매끈한 몸을 만든다."""
    me = bpy.data.meshes.new(name); me.from_pydata(pts, edges, []); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    sk = o.modifiers.new('skin', 'SKIN'); sk.use_smooth_shade = True
    for i, r in enumerate(radii): o.data.skin_vertices[0].data[i].radius = r
    o.data.skin_vertices[0].data[root].use_root = True
    sd = o.modifiers.new('sd', 'SUBSURF'); sd.levels = subd; sd.render_levels = subd
    o.data.materials.append(m); K.PARTS.append(o); return o

def sphere(c, r, m, seg=14, ring=10):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=1, location=c)
    o = bpy.context.active_object; o.scale = r; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.shade_smooth(); o.data.materials.append(m); K.PARTS.append(o); return o

def cut_below(o, z):
    """o 에서 z 아래 면을 지운다 (머리카락 아래쪽 등)."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z < z], context='FACES'); bm.to_mesh(o.data); bm.free(); o.data.update()

def finish(name, dark_below=None):
    o = K.join(name, smooth=True)
    bake_vertex_ao(o, vars(K))
    ca = o.data.color_attributes.active_color
    if dark_below is not None:   # 신발: 발목 아래 꼭짓점을 어둡게 (게임의 바지 색과 곱해져 거의 검게)
        for li, lp in enumerate(o.data.loops):
            if o.data.vertices[lp.vertex_index].co.z < dark_below:
                c = ca.data[li].color; ca.data[li].color = (c[0] * .16, c[1] * .15, c[2] * .14, 1)
    e = K.export(o, name, colors=True); print(name, e['tris'], 'tris')
    bpy.data.objects.remove(o)

def build():
    K.reset(); K.MATS.clear()
    cloth = K.mat('cloth', '#ffffff', rough=.85); skinm = K.mat('skin', '#ffffff', rough=.55); hairm = K.mat('hair', '#ffffff', rough=.7)
    # 몸통: 골반 → 허리 → 가슴 → 어깨 · 목 밑동 (옷 입은 모양, 앞뒤로 납작)
    pts = [(0, 0, .9), (0, 0, 1.04), (0, -.005, 1.18), (0, -.01, 1.32), (0, -.01, 1.44), (.17, -.01, 1.43), (-.17, -.01, 1.43), (0, -.01, 1.5),
           (.09, 0, .9), (-.09, 0, .9)]
    edges = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (4, 6), (4, 7), (0, 8), (0, 9)]
    radii = [(.165, .11), (.155, .105), (.165, .11), (.185, .12), (.13, .095), (.08, .075), (.08, .075), (.058, .058), (.1, .1), (.1, .1)]
    skin('torso', pts, edges, radii, cloth, subd=2, root=0)
    finish('torso')
    # 머리: 두개골 · 턱 · 코 · 귀 · 목
    K.reset(); K.MATS.clear(); skinm = K.mat('skin', '#ffffff', rough=.55); hairm = K.mat('hair', '#ffffff', rough=.7); cloth = K.mat('cloth', '#ffffff', rough=.85)
    sphere((0, .0, 1.665), (.088, .102, .113), skinm)
    sphere((0, .035, 1.6), (.068, .07, .06), skinm)                     # 턱 · 볼
    skin('nose', [(0, .085, 1.66), (0, .108, 1.625)], [(0, 1)], [(.014, .014), (.017, .012)], skinm, subd=1)
    for s in (-1, 1): sphere((s * .09, -.005, 1.655), (.016, .028, .034), skinm, 10, 8)
    skin('neck', [(0, -.01, 1.47), (0, -.005, 1.59)], [(0, 1)], [(.05, .05), (.048, .048)], skinm, subd=1)
    finish('head')
    # 머리카락: 짧은 머리(정수리 · 뒤통수만 덮는 캡) · 긴 머리(어깨까지 내려오는 단발)
    K.reset(); K.MATS.clear(); hairm = K.mat('hair', '#ffffff', rough=.7)
    h = sphere((0, -.012, 1.68), (.096, .112, .112), hairm, 16, 12); cut_below(h, 1.655)
    bm = bmesh.new(); bm.from_mesh(h.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().y > .05 and f.calc_center_median().z < 1.73], context='FACES'); bm.to_mesh(h.data); bm.free()
    finish('hair_s')
    K.reset(); K.MATS.clear(); hairm = K.mat('hair', '#ffffff', rough=.7)
    h = sphere((0, -.015, 1.67), (.1, .116, .118), hairm, 16, 12); cut_below(h, 1.5)
    bm = bmesh.new(); bm.from_mesh(h.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().y > .02 and f.calc_center_median().z < 1.72], context='FACES'); bm.to_mesh(h.data); bm.free()
    finish('hair_l')
    # 긴 외투 자락 (허리 아래 무릎까지, 다리 위로 덮는다)
    K.reset(); K.MATS.clear(); cloth = K.mat('cloth', '#ffffff', rough=.85)
    skin('coat', [(0, -.01, 1.1), (0, -.015, .82), (0, -.02, .56)], [(0, 1), (1, 2)], [(.16, .11), (.19, .13), (.21, .14)], cloth)
    finish('coat')
    # 팔(오른쪽, 어깨 관절 원점): 위팔 → 팔꿈치(살짝 굽힘) → 손목
    K.reset(); K.MATS.clear(); cloth = K.mat('cloth', '#ffffff', rough=.85)
    skin('arm', [(0, 0, .03), (.025, -.01, -.29), (.02, .045, -.56)], [(0, 1), (1, 2)], [(.068, .068), (.054, .054), (.044, .04)], cloth)
    finish('arm')
    K.reset(); K.MATS.clear(); skinm = K.mat('skin', '#ffffff', rough=.55)
    skin('hand', [(.02, .05, -.55), (.02, .06, -.64)], [(0, 1)], [(.024, .036), (.018, .03)], skinm, subd=1)
    sphere((.0, .07, -.585), (.012, .012, .03), skinm, 8, 6)                                      # 엄지
    finish('hand')
    # 넓적다리(엉덩이 관절 원점) · 정강이+신발(무릎 원점)
    K.reset(); K.MATS.clear(); cloth = K.mat('cloth', '#ffffff', rough=.85)
    skin('thigh', [(0, 0, .06), (0, .012, -.5)], [(0, 1)], [(.1, .1), (.066, .066)], cloth)   # 끝이 둥글게 줄어드니 관절보다 조금 길게
    finish('thigh')
    K.reset(); K.MATS.clear(); cloth = K.mat('cloth', '#ffffff', rough=.85)
    skin('shin', [(0, 0, .05), (0, -.01, -.4), (0, -.012, -.45), (0, .07, -.47), (0, .14, -.47)], [(0, 1), (1, 2), (2, 3), (3, 4)],
         [(.066, .066), (.048, .048), (.05, .055), (.052, .044), (.044, .034)], cloth)
    finish('shin', dark_below=-.405)
    K.MAN['joints'] = J

if __name__ == '__main__':
    K.BIN.clear(); K.MAN.clear(); K.MAN.update({'meshes': {}})
    build()
    with open(os.path.join(K.OUT, 'people.bin'), 'wb') as f: f.write(K.BIN)
    with open(os.path.join(K.OUT, 'people.json'), 'w') as f: json.dump(K.MAN, f, separators=(',', ':'))
    print('bin', len(K.BIN))
