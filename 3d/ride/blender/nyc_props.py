"""뉴욕 시내 리얼 키트 — 차(세단 · 노란 택시)와 거리 소품(가로등 · 소화전 · 쓰레기통 · 우체통).
nyc_kit.py 가 build(globals()) 로 부른다. 그늘(AO)은 꼭짓점 색으로 굽는다. 블렌더 +Y = 게임 앞(-Z)."""
import bpy, bmesh, math

def bake_vertex_ao(o, K):
    me = o.data
    if not me.color_attributes: me.color_attributes.new('ao', 'BYTE_COLOR', 'CORNER')
    me.color_attributes.active_color = me.color_attributes[0]
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    K['mode']('albedo'); bpy.context.scene.render.bake.use_selected_to_active = False
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')

def profile(pts, width, m, K, bevel=.05, segs=3):
    """옆모습(y, z) 다각형을 x 방향으로 width 만큼 밀어 낸 몸체."""
    me = bpy.data.meshes.new('p'); hw = width / 2; n = len(pts)
    vs = [(-hw, y, z) for y, z in pts] + [(hw, y, z) for y, z in pts]
    fs = [list(range(n))[::-1], [n + i for i in range(n)]] + [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    me.from_pydata(vs, [], fs); me.update()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(me); bm.free(); me.update()   # 바깥을 보게
    o = bpy.data.objects.new('p', me); bpy.context.collection.objects.link(o); o.data.materials.append(m)
    bpy.context.view_layer.objects.active = o
    if bevel:
        b = o.modifiers.new('b', 'BEVEL'); b.width = bevel; b.segments = segs; b.limit_method = 'ANGLE'
    K['PARTS'].append(o); return o

def car(K, taxi=False):
    box, cyl, mat = K['box'], K['cyl'], K['mat']
    paint = mat('car_paint', '#ffffff', rough=.3, metal=.35); glass = mat('car_glass', '#1b242c', rough=.05, metal=.6)
    trim = mat('car_trim', '#16181a', rough=.6); tire = mat('car_tire', '#141414', rough=.9); rim = mat('car_rim', '#b9bec4', rough=.25, metal=.9)
    head = mat('car_head', '#fff4d8', rough=.1); tail = mat('car_tail', '#c8160c', rough=.2)
    body = [(-2.42, .3), (-2.46, .56), (-2.36, .98), (-1.45, 1.03), (1.35, 1.0), (2.3, .86), (2.44, .58), (2.4, .3)]
    profile(body, 1.94, paint, K, bevel=.08)
    profile([(-1.38, 1.0), (-.98, 1.47), (.5, 1.5), (1.22, 1.0)], 1.74, glass, K, bevel=.04, segs=2)
    box(-.84, .84, -.96, .52, 1.44, 1.53, paint, bevel=.03)                                      # 지붕
    for x in (-.86, .86): box(x - .04, x + .04, -.28, -.16, 1.0, 1.5, paint)                    # B 기둥
    for y in (-2.47, 2.45): box(-.98, .98, y - .07, y + .07, .28, .5, trim, bevel=.03)           # 범퍼
    box(-.99, .99, -1.9, 1.9, .3, .44, trim)                                                      # 문턱 몰딩
    for x in (-.88, .88):
        for y in (-1.45, 1.45):
            cyl((x, y, .38), .26, .38, tire, verts=18, axis='X')
            cyl((x * 1.14, y, .38), .04, .24, rim, verts=14, axis='X')
    for x in (-.68, .68):
        box(x - .24, x + .24, 2.36, 2.46, .74, .88, head); box(x - .21, x + .21, -2.46, -2.38, .76, .92, tail)
    box(-.55, .55, 2.4, 2.47, .55, .68, trim)                                                     # 그릴
    if taxi:
        box(-.45, .45, -.35, .05, 1.53, 1.82, mat('taxi_sign', '#fff6c8', rough=.4), bevel=.04)
    o = K['join']('taxi' if taxi else 'car', smooth=True)
    bake_vertex_ao(o, K); return o

def lamp(K):
    box, cyl, mat = K['box'], K['cyl'], K['mat']
    iron = mat('lamp_iron', '#2e3a34', rough=.5, metal=.5); bulb = mat('lamp_bulb', '#fff4d6', rough=.2)
    cyl((0, 0, .3), .6, .26, iron, verts=8, r2=.2); cyl((0, 0, 4.4), 7.6, .16, iron, verts=8, r2=.11)
    cyl((0, 0, .62), .08, .3, iron, verts=8)
    for k in range(6):                                                                            # 굽은 팔
        a0, a1 = k / 6 * math.pi / 2, (k + 1) / 6 * math.pi / 2; r = .9
        y0, z0 = r * (1 - math.cos(a0)), 8.0 + r * math.sin(a0); y1, z1 = r * (1 - math.cos(a1)), 8.0 + r * math.sin(a1)
        o = box(-.05, .05, -.05, .05, 0, math.hypot(y1 - y0, z1 - z0) + .02, iron)
        o.rotation_euler = (-math.atan2(y1 - y0, z1 - z0), 0, 0); o.location = (0, y0, z0)
        bpy.context.view_layer.objects.active = o; bpy.ops.object.transform_apply(location=True, rotation=True)
    box(-.05, .05, .9, 1.9, 8.86, 8.96, iron)
    box(-.28, .28, 1.75, 2.75, 8.62, 8.92, iron, bevel=.08)                                         # 코브라 머리
    box(-.22, .22, 1.85, 2.65, 8.57, 8.63, bulb)
    o = K['join']('lamp', smooth=True); bake_vertex_ao(o, K); return o

def hydrant(K):
    box, cyl, mat = K['box'], K['cyl'], K['mat']
    red = mat('hydrant', '#b5332a', rough=.55, metal=.1); cap = mat('hydrant_cap', '#c9b63a', rough=.5, metal=.2)
    cyl((0, 0, .05), .1, .26, red, verts=16); cyl((0, 0, .41), .62, .17, red, verts=16)
    cyl((0, 0, .76), .08, .21, red, verts=16); cyl((0, 0, .875), .15, .19, cap, verts=16, r2=.08)
    cyl((0, 0, .985), .07, .05, cap, verts=8)
    cyl((0, .2, .5), .26, .085, red, verts=10, axis='Y')                                           # 앞 주둥이 (+Y = 차도 쪽)
    cyl((.2, 0, .5), .2, .07, red, verts=10, axis='X'); cyl((-.2, 0, .5), .2, .07, red, verts=10, axis='X')
    o = K['join']('hydrant', smooth=True); bake_vertex_ao(o, K); return o

def trash(K):
    box, cyl, mat = K['box'], K['cyl'], K['mat']
    g = mat('trash', '#2f5a3a', rough=.6, metal=.3)
    cyl((0, 0, .475), .95, .3, g, verts=14, r2=.36)
    for k in range(10):
        a = k / 10 * math.pi * 2; x, y = math.cos(a) * .35, math.sin(a) * .35
        box(x - .02, x + .02, y - .02, y + .02, .05, .95, g)
    cyl((0, 0, .965), .07, .38, g, verts=14)
    o = K['join']('trash', smooth=True); bake_vertex_ao(o, K); return o

def mailbox(K):
    box, cyl, mat = K['box'], K['cyl'], K['mat']
    blue = mat('usps', '#1f3f8a', rough=.45, metal=.3); dark = mat('usps_leg', '#1a1d22', rough=.6)
    for x in (-.25, .25):
        for y in (-.2, .2): box(x - .04, x + .04, y - .04, y + .04, 0, .45, dark)
    box(-.32, .32, -.27, .27, .45, 1.15, blue, bevel=.03)
    cyl((0, 0, 1.15), .54, .32, blue, verts=16, axis='Y')
    box(-.18, .18, .26, .29, .95, 1.05, dark)
    o = K['join']('mailbox', smooth=True); bake_vertex_ao(o, K); return o

def build(K):
    """K = nyc_kit 전역 (box · cyl · mat · join · reset · export · MAN …)."""
    for name, fn in (('car', lambda: car(K)), ('taxi', lambda: car(K, True)), ('lamp', lambda: lamp(K)), ('hydrant', lambda: hydrant(K)),
                     ('trash', lambda: trash(K)), ('mailbox', lambda: mailbox(K))):
        K['reset'](); K['MATS'].clear()
        o = fn()
        e = K['export'](o, name, colors=True)
        e['mats'] = {m.name: K['MAT_INFO'](m) for m in o.data.materials}
        print(name, e['tris'], 'tris')
