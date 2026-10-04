"""뉴욕 시내 리얼 키트 — Blender(bpy)로 건물 외관 모듈 · 차 · 거리 소품을 만들고 텍스처를 구워(bake) 게임용으로 내보낸다.

실행:  python3 3d/ride/blender/nyc_kit.py          (pip install bpy — Blender 5.x 를 파이썬 모듈로)
출력:  3d/ride/nyc/nyc.json · nyc.bin (메시)  ·  <style>_c.jpg (색 + AO) · <style>_m.jpg (R 창문 · G 거칠기 · B 금속) · <style>_fc/_fm.jpg (먼 층용 평판)

좌표: 블렌더 Z-up 에서 만들고 내보낼 때 three.js Y-up 으로 바꾼다 (x, z, -y).
외관 모듈은 x 0..W (칸 폭), z 0..높이, 바깥(거리 쪽)이 -Y — 게임에서는 +Z 가 거리 쪽.
"""
import bpy, bmesh, math, os, json, struct, random
import numpy as np

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'nyc')
os.makedirs(OUT, exist_ok=True)
random.seed(7)

H = 3.9          # 층 높이 (게임 창문 셰이더와 같다)
G = 4.875        # 1층(가게) 높이 = 1.25 층
C_H = 1.4        # 코니스 높이
T = 0.45         # 벽 두께 (게임에서 건물 상자 앞면을 이만큼 들여 놓는다)
ATLAS = 1024

# ───────────────────────── 장면 · 재질 ─────────────────────────
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24
    sc.render.bake.margin = 4
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)

MATS = {}
def mat(name, color, rough=.8, metal=0., mask=0., tex=None, scale=1.):
    """tex: None | 'brick' | 'stone' | 'noise' | 'chevron' | 'granite' — 굽기용 절차적 무늬."""
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    p = N['Principled BSDF']; p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = 0
    out = N['Material Output']
    c = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
    c = [x ** 2.2 for x in c] + [1]
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); L.new(tc.outputs['Object'], mp.inputs['Vector'])
    mp.inputs['Scale'].default_value = (scale, scale, scale)
    col_out = None
    if tex == 'brick':
        b = N.new('ShaderNodeTexBrick'); L.new(mp.outputs['Vector'], b.inputs['Vector'])
        # 벽면은 XZ 평면 — 벽돌 무늬가 그 면에 서도록 Y/Z 를 바꾼 좌표를 넣는다
        sep = N.new('ShaderNodeSeparateXYZ'); com = N.new('ShaderNodeCombineXYZ')
        L.new(mp.outputs['Vector'], sep.inputs['Vector'])
        L.new(sep.outputs['X'], com.inputs['X']); L.new(sep.outputs['Z'], com.inputs['Y']); L.new(sep.outputs['Y'], com.inputs['Z'])
        L.new(com.outputs['Vector'], b.inputs['Vector'])
        b.inputs['Color1'].default_value = c
        b.inputs['Color2'].default_value = [c[0] * .78, c[1] * .74, c[2] * .72, 1]
        b.inputs['Mortar'].default_value = [.55, .5, .44, 1]
        b.inputs['Scale'].default_value = 4.2; b.inputs['Mortar Size'].default_value = .018
        b.inputs['Brick Width'].default_value = .5; b.inputs['Row Height'].default_value = .18
        b.offset = .5; b.squash = 1
        nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.0; L.new(mp.outputs['Vector'], nz.inputs['Vector'])
        mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs['Factor'].default_value = .35
        L.new(b.outputs['Color'], mix.inputs[6]); L.new(nz.outputs['Color'], mix.inputs[7])
        col_out = mix.outputs[2]
    elif tex in ('stone', 'noise', 'granite'):
        nz = N.new('ShaderNodeTexNoise'); L.new(mp.outputs['Vector'], nz.inputs['Vector'])
        nz.inputs['Scale'].default_value = {'stone': 2.2, 'noise': 6, 'granite': 40}[tex]; nz.inputs['Detail'].default_value = 8
        ramp = N.new('ShaderNodeValToRGB'); L.new(nz.outputs['Fac'], ramp.inputs['Fac'])
        k = {'stone': (.86, 1.05), 'noise': (.8, 1.08), 'granite': (.55, 1.4)}[tex]
        ramp.color_ramp.elements[0].color = [min(1, x * k[0]) for x in c[:3]] + [1]
        ramp.color_ramp.elements[1].color = [min(1, x * k[1]) for x in c[:3]] + [1]
        col_out = ramp.outputs['Color']
    elif tex == 'chevron':
        wv = N.new('ShaderNodeTexWave'); wv.wave_profile = 'TRI'; wv.inputs['Scale'].default_value = 3.0
        L.new(mp.outputs['Vector'], wv.inputs['Vector'])
        ramp = N.new('ShaderNodeValToRGB'); L.new(wv.outputs['Fac'], ramp.inputs['Fac'])
        ramp.color_ramp.elements[0].color = [x * .6 for x in c[:3]] + [1]; ramp.color_ramp.elements[1].color = c
        col_out = ramp.outputs['Color']
    if col_out is not None: L.new(col_out, p.inputs['Base Color'])
    else: p.inputs['Base Color'].default_value = c
    # ORM 굽기용: Emission(R 창문 마스크, G 거칠기, B 금속)
    em = N.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (mask, rough, metal, 1); em.inputs['Strength'].default_value = 1
    m['em'] = em.name; m['pb'] = p.name; m['out'] = out.name
    m['info'] = json.dumps({'color': color, 'rough': rough, 'metal': metal, 'mask': mask})
    img = N.new('ShaderNodeTexImage'); img.name = 'BAKE'; N.active = img
    MATS[name] = m
    return m

def mode(kind):
    """'albedo' → Principled 로 출력 · 'orm' → Emission 으로 출력."""
    for m in MATS.values():
        nt = m.node_tree; out = nt.nodes[m['out']]
        for l in list(out.inputs['Surface'].links): nt.links.remove(l)
        src = nt.nodes[m['pb']].outputs['BSDF'] if kind == 'albedo' else nt.nodes[m['em']].outputs['Emission']
        nt.links.new(src, out.inputs['Surface'])

def set_bake_image(img):
    for m in MATS.values():
        n = m.node_tree.nodes['BAKE']; n.image = img; m.node_tree.nodes.active = n

# ───────────────────────── 기하 도우미 ─────────────────────────
PARTS = []
def box(x0, x1, y0, y1, z0, z1, m, bevel=0.):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.scale = (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0)); o.location = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(m)
    if bevel:
        b = o.modifiers.new('b', 'BEVEL'); b.width = bevel; b.segments = 2; b.limit_method = 'ANGLE'
    PARTS.append(o); return o

def cyl(c, length, r, m, verts=12, axis='Z', r2=None):
    """c = 가운데 (x, y, z), axis 방향으로 길이 length 인 원기둥(r2 면 원뿔대)."""
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=length)
    o = bpy.context.active_object
    o.rotation_euler = {'Z': (0, 0, 0), 'X': (0, math.pi / 2, 0), 'Y': (math.pi / 2, 0, 0)}[axis]; o.location = c
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    o.data.materials.append(m); PARTS.append(o); return o

def join(name, smooth=False):
    global PARTS
    bpy.ops.object.select_all(action='DESELECT')
    for o in PARTS:
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.ops.object.join(); o = bpy.context.active_object; o.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if smooth: bpy.ops.object.shade_auto_smooth(angle=math.radians(40))
    else: bpy.ops.object.shade_flat()
    PARTS = []
    return o

def uv_into(o, rect):
    """o 를 펼쳐(smart project) 아틀라스의 rect=(u0,v0,u1,v1) 안에 넣는다."""
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.01, scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    uv = o.data.uv_layers.active.data; u0, v0, u1, v1 = rect
    for d in uv: d.uv = (u0 + d.uv[0] * (u1 - u0), v0 + d.uv[1] * (v1 - v0))

def plane_uv(o, rect):
    """평면 층(fl): 앞면 투영 — x 0..W, z 0..H 를 rect 에 그대로."""
    uv = o.data.uv_layers.new().data; u0, v0, u1, v1 = rect
    xs = [v.co.x for v in o.data.vertices]; zs = [v.co.z for v in o.data.vertices]
    W = max(xs); Hh = max(zs)
    for poly in o.data.polygons:
        for li in poly.loop_indices:
            co = o.data.vertices[o.data.loops[li].vertex_index].co
            uv[li].uv = (u0 + co.x / W * (u1 - u0), v0 + co.z / Hh * (v1 - v0))

# ───────────────────────── 외관 스타일 ─────────────────────────
def window_double_hung(x0, x1, z0, z1, frame, glass, depth=.16, muntins=True):
    f = .08
    box(x0, x1, depth, depth + .1, z0, z0 + f, frame); box(x0, x1, depth, depth + .1, z1 - f, z1, frame)
    box(x0, x0 + f, depth, depth + .1, z0, z1, frame); box(x1 - f, x1, depth, depth + .1, z0, z1, frame)
    zm = (z0 + z1) / 2
    box(x0, x1, depth - .03, depth + .07, zm - .035, zm + .035, frame)          # 미닫이 창틀 (위 · 아래 창)
    box(x0 + f, x1 - f, depth + .05, depth + .07, z0 + f, z1 - f, glass)
    if muntins:
        for k in (1, 2):
            x = x0 + (x1 - x0) * k / 3; box(x - .015, x + .015, depth + .02, depth + .05, zm, z1 - f, frame)

def style_brick(W=3.0):
    brick = mat('brick', '#8f4130', tex='brick'); stone = mat('stone_trim', '#c9bfa8', tex='stone', rough=.85)
    white = mat('paint_white', '#e6e1d6', rough=.55); glass = mat('glass', '#1d2a33', rough=.06, metal=.55, mask=1)
    iron = mat('cast_iron', '#24302a', rough=.5, metal=.3); sign = mat('sign_band', '#1c1f22', rough=.6)
    shop = mat('glass_shop', '#2a3a44', rough=.05, metal=.5, mask=1); cop = mat('cornice_metal', '#857c6c', rough=.65, metal=.2)
    ww, z0, z1 = 1.15, .95, 3.0; a, b = (W - ww) / 2, (W + ww) / 2
    # 윗층 한 칸
    box(0, a, 0, T, 0, H, brick); box(b, W, 0, T, 0, H, brick); box(a, b, 0, T, 0, z0, brick); box(a, b, 0, T, z1, H, brick)
    box(a - .16, b + .16, -.07, .05, z1, z1 + .32, stone)                         # 상인방
    box(a - .12, b + .12, -.13, .05, z0 - .12, z0, stone)                        # 창턱
    window_double_hung(a, b, z0, z1, white, glass)
    box(a, b, T - .02, T, z0, z1, mat('room', '#30281f', rough=.9, mask=1))       # 방 안(어둠 · 밤에 불)
    up = join('brick_up')
    # 1층 가게
    box(0, .32, -.12, T, 0, G, iron); box(W - .32, W, -.12, T, 0, G, iron)
    box(.32, W - .32, -.02, T, 0, .55, iron)                                       # 진열창 아래 판
    box(.32, W - .32, -.1, T, 3.55, 4.45, sign); box(-.02, W + .02, -.28, T, 4.45, 4.62, iron); box(0, W, 0, T, 4.62, G, brick)
    box(.32, W - .32, .18, .22, .55, 3.55, shop); box(W / 2 - .04, W / 2 + .04, .1, .2, .55, 3.55, iron)
    box(.32, W - .32, .1, .2, 3.0, 3.07, iron)                                     # 채광창 가로살
    box(.32, W - .32, T - .02, T, .55, 3.55, mat('shop_in', '#5b4a35', rough=.9, mask=1))
    gr = join('brick_gr')
    # 코니스: 프리즈 · 까치발 · 덴틸 · 처마
    box(0, W, 0, T, 0, C_H, brick)
    for x in (.35, W - .55):
        box(x, x + .2, -.45, 0, .45, .82, cop)
    for i in range(int(W / .25)):
        x = i * .25 + .06; box(x, x + .12, -.22, 0, .7, .82, cop)
    box(-.02, W + .02, -.55, T, .82, 1.02, cop); box(-.02, W + .02, -.62, T, 1.02, 1.1, cop)
    box(0, W, -.05, T, 1.1, C_H, brick)
    co = join('brick_co')
    return dict(up=up, gr=gr, co=co, W=W)

def style_lime(W=3.0):
    lime = mat('limestone', '#d6cbb4', tex='stone', rough=.85); bronze = mat('bronze', '#3a3229', rough=.45, metal=.6)
    glass = mat('glass', '#1d2a33', rough=.06, metal=.55, mask=1); shop = mat('glass_shop', '#2a3a44', rough=.05, metal=.5, mask=1)
    room = mat('room', '#30281f', rough=.9, mask=1)
    ww, z0, z1 = 1.25, .8, 3.05; a, b = (W - ww) / 2, (W + ww) / 2
    box(0, a, 0, T, 0, H, lime); box(b, W, 0, T, 0, H, lime); box(a, b, 0, T, 0, z0, lime); box(a, b, 0, T, z1, H, lime)
    box(a - .18, a, -.08, .05, z0, z1 + .18, lime); box(b, b + .18, -.08, .05, z0, z1 + .18, lime)   # 창 둘레 문틀
    box(a - .18, b + .18, -.08, .05, z1, z1 + .18, lime); box(W / 2 - .14, W / 2 + .14, -.14, .05, z1 - .05, z1 + .3, lime)  # 쐐기돌
    box(a - .2, b + .2, -.15, .05, z0 - .1, z0, lime); box(0, W, -.04, .05, H - .2, H - .1, lime)
    window_double_hung(a, b, z0, z1, bronze, glass, muntins=False)
    box(a, b, T - .02, T, z0, z1, room)
    up = join('lime_up')
    for i in range(7):                                                             # 러스티케이션(줄눈 깊은 돌쌓기)
        zz = i * .7; box(0, W, -.1 if i % 2 == 0 else -.08, T, zz + .05, min(G, zz + .7), lime)
    box(0, W, 0, T, 0, G, lime)
    wa, wb = .45, W - .45
    # 진열창: 줄눈 돌 앞에 청동 틀 + 유리를 붙인다
    box(wa - .08, wb + .08, -.2, -.1, .62, 3.78, bronze)
    box(wa, wb, -.24, -.18, .7, 3.7, shop); box(W / 2 - .04, W / 2 + .04, -.27, -.2, .7, 3.7, bronze)
    box(wa, wb, -.27, -.2, 3.05, 3.12, bronze)
    box(0, W, -.32, .05, 4.3, 4.5, lime)
    gr = join('lime_gr')
    box(0, W, 0, T, 0, C_H, lime)
    for i in range(int(W / .5)):
        x = i * .5 + .15; box(x, x + .2, -.4, 0, .55, .78, lime)                    # 모딜리언
    box(-.02, W + .02, -.5, T, .78, .98, lime); box(0, W, -.1, T, .98, C_H, lime)
    co = join('lime_co')
    return dict(up=up, gr=gr, co=co, W=W)

def style_deco(W=3.0):
    st = mat('deco_stone', '#c8b28c', tex='stone', rough=.8); span = mat('deco_spandrel', '#4a4234', tex='chevron', rough=.5, metal=.5)
    glass = mat('glass', '#1d2a33', rough=.06, metal=.55, mask=1); gran = mat('granite', '#2a2628', tex='granite', rough=.2, metal=.1)
    shop = mat('glass_shop', '#2a3a44', rough=.05, metal=.5, mask=1); bronze = mat('bronze', '#3a3229', rough=.45, metal=.6)
    room = mat('room', '#30281f', rough=.9, mask=1)
    p = .5
    box(0, p, -.32, T, 0, H, st); box(W - p, W, -.32, T, 0, H, st)                # 세로 기둥(피어)
    box(p, W - p, .08, T, 0, 1.0, span)                                            # 스팬드럴 판
    box(p, W - p, .18, .2, 1.0, H, glass); box(p, W - p, T - .02, T, 1.0, H, room)
    for k in (1, 2):
        x = p + (W - 2 * p) * k / 3; box(x - .03, x + .03, .1, .2, 1.0, H, bronze)
    box(p, W - p, .1, .2, 1.0, 1.06, bronze)
    up = join('deco_up')
    box(0, .45, -.25, T, 0, G, gran); box(W - .45, W, -.25, T, 0, G, gran)
    box(.45, W - .45, -.05, T, 0, .4, gran); box(.45, W - .45, -.15, T, 3.9, G, st)
    for k in range(4): box(.45, W - .45, -.2 - k * .03, -.12, 3.95 + k * .2, 4.05 + k * .2, bronze)   # 계단식 문틀
    box(.45, W - .45, .1, .14, .4, 3.9, shop); box(W / 2 - .04, W / 2 + .04, .02, .12, .4, 3.9, bronze)
    box(.45, W - .45, T - .02, T, .4, 3.9, mat('shop_in', '#5b4a35', rough=.9, mask=1))
    gr = join('deco_gr')
    for k in range(3): box(-.0, W, -.32 + k * .1, T, k * .45, k * .45 + .45, st)  # 계단식 왕관
    box(0, W, 0, T, 1.35, C_H, st)
    co = join('deco_co')
    return dict(up=up, gr=gr, co=co, W=W)

def style_glass(W=2.3):
    alu = mat('aluminum', '#a9b0b7', rough=.3, metal=.85); glass = mat('glass_cw', '#3a5468', rough=.04, metal=.65, mask=1)
    spand = mat('spandrel', '#26323b', rough=.12, metal=.6); room = mat('room_cw', '#26303a', rough=.9, mask=1)
    box(0, W, 0, .05, 0, .95, spand); box(0, W, 0, .05, .95, H, glass); box(0, W, T - .02, T, .95, H, room)
    box(0, .07, -.28, .1, 0, H, alu)                                               # 세로 지느러미(멀리언)
    box(0, W, -.06, .06, .92, .99, alu); box(0, W, -.06, .06, H - .04, H, alu)
    up = join('glass_up')
    box(0, .12, -.15, .1, 0, G, alu); box(.12, W, .05, .08, 0, G - .3, mat('glass_shop', '#2a3a44', rough=.05, metal=.5, mask=1))
    box(.12, W, T - .02, T, 0, G - .3, mat('lobby_in', '#c8c2b4', rough=.7, mask=1))
    box(0, W, -1.2, .1, G - .3, G - .1, alu)                                       # 차양(캐노피)
    box(0, W, 0, .06, G - .1, G, spand)
    gr = join('glass_gr')
    box(0, W, -.08, T, 0, C_H - .2, spand); box(-.02, W + .02, -.14, T, C_H - .2, C_H, alu)
    co = join('glass_co')
    return dict(up=up, gr=gr, co=co, W=W)

def fire_escape(W=3.0):
    """벽돌 건물 앞 철제 비상계단 한 층 (두 칸 폭). 바깥 -Y."""
    iron = mat('fire_escape', '#1e2326', rough=.55, metal=.6)
    L = 2 * W - .4; x0 = .2; d = -1.05
    box(x0, x0 + L, d, -.02, 0, .05, iron)                                         # 발판
    for x in np.arange(x0, x0 + L + .01, .45): box(x - .012, x + .012, d - .012, d + .012, .05, 1.0, iron)
    for xx in (x0, x0 + L):
        for y in np.arange(d, 0, .5): box(xx - .012, xx + .012, y - .012, y + .012, .05, 1.0, iron)
    box(x0, x0 + L, d - .02, d + .02, .97, 1.02, iron); box(x0, x0 + L, d - .02, d + .02, .5, .53, iron)
    box(x0 - .02, x0 + .02, d, 0, .97, 1.02, iron); box(x0 + L - .02, x0 + L + .02, d, 0, .97, 1.02, iron)
    # 아래층으로 내려가는 계단
    sx0, sx1, n = x0 + .3, x0 + 2.6, 9
    for side in (d + .1, d + .7):
        o = box(-.03, .03, side - .03, side + .03, 0, math.hypot(sx1 - sx0, H), iron)
        o.rotation_euler = (0, math.atan2(sx1 - sx0, H), 0); o.location = (sx0, side, 0)
        bpy.context.view_layer.objects.active = o; bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    for k in range(n):
        t = (k + .5) / n; box(sx0 + (sx1 - sx0) * t - .1, sx0 + (sx1 - sx0) * t + .1, d + .1, d + .7, -H * t, -H * t + .03, iron)
    return join('fire_escape')

# ───────────────────────── 굽기 ─────────────────────────
def bake_atlas(objs, name, size=ATLAS):
    img = bpy.data.images.new(name + '_c', size, size); ao = bpy.data.images.new(name + '_ao', size, size)
    orm = bpy.data.images.new(name + '_m', size, size)
    sc = bpy.context.scene; bk = sc.render.bake; bk.use_clear = True
    def run(kind, image, **kw):
        set_bake_image(image)
        first = True
        for o in objs:
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
            bk.use_clear = first; first = False
            bpy.ops.object.bake(type=kind, **kw)
    mode('albedo'); run('DIFFUSE', img, pass_filter={'COLOR'}); run('AO', ao)
    mode('orm'); run('EMIT', orm); mode('albedo')
    return img, ao, orm

def bake_flat(high, W, rect_img, name, size=512):
    """윗층 3D 모듈을 앞면 평판에 구워 멀리 있는 층용 텍스처(색·AO·노멀·ORM)를 만든다."""
    bpy.ops.mesh.primitive_plane_add(size=1); pl = bpy.context.active_object
    pl.scale = (W, H, 1); pl.rotation_euler = (math.pi / 2, 0, 0); pl.location = (W / 2, -.35, H / 2)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True); pl.name = name + '_fl'
    plane_uv(pl, (0, 0, 1, 1))
    m = bpy.data.materials.new(name + '_flm'); m.use_nodes = True; pl.data.materials.append(m)
    n = m.node_tree.nodes.new('ShaderNodeTexImage'); m.node_tree.nodes.active = n
    out = {}
    sc = bpy.context.scene; bk = sc.render.bake; bk.use_selected_to_active = True; bk.cage_extrusion = .9; bk.use_clear = True
    for kind, key, kw in (('DIFFUSE', 'c', {'pass_filter': {'COLOR'}}), ('AO', 'ao', {}), ('EMIT', 'm', {})):
        img = bpy.data.images.new(name + '_fl_' + key, size, size)
        if key == 'n': img.colorspace_settings.name = 'Non-Color'
        n.image = img
        mode('orm' if key == 'm' else 'albedo')
        bpy.ops.object.select_all(action='DESELECT'); high.select_set(True); pl.select_set(True); bpy.context.view_layer.objects.active = pl
        bpy.ops.object.bake(type=kind, **kw); out[key] = img
    bk.use_selected_to_active = False; mode('albedo')
    return pl, out

def px(img):
    a = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4); return a[::-1, :, :3]

def to_srgb(x): return np.where(x <= .0031308, x * 12.92, 1.055 * np.power(np.clip(x, 0, 1), 1 / 2.4) - .055)

def save_jpg(arr, path, srgb=True, q=88):
    from PIL import Image
    a = to_srgb(arr) if srgb else arr
    Image.fromarray((np.clip(a, 0, 1) * 255 + .5).astype(np.uint8)).save(path, quality=q, optimize=True)

def compose(c, ao):
    a = ao[..., :1]; return c * (.42 + .58 * a)

# ───────────────────────── 내보내기 ─────────────────────────
MAT_INFO = lambda m: json.loads(m['info'])
BIN = bytearray(); MAN = {'meshes': {}, 'textures': {}, 'kits': {}}
def put(arr):
    while len(BIN) % 4: BIN.append(0)
    off = len(BIN); BIN.extend(arr.tobytes()); return [off, arr.size]

def export(o, key, colors=False):
    """삼각형 · 모서리별 노멀/UV 로 펴서 (위치 · 노멀 · UV · 색) + 인덱스. Y-up 으로 바꾼다."""
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    me = o.data
    tri = bmesh.new(); tri.from_mesh(me); bmesh.ops.triangulate(tri, faces=tri.faces[:]); tri.to_mesh(me); tri.free(); me.update()
    cn = me.corner_normals; uvl = me.uv_layers.active.data if me.uv_layers else None
    ca = me.color_attributes.active_color if colors and me.color_attributes else None
    verts = {}; pos = []; nor = []; uvs = []; col = []; idx = []; mids = []
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; co = me.vertices[vi].co; n = cn[li].vector
            u = tuple(round(x, 5) for x in uvl[li].uv) if uvl else (0, 0)
            c = tuple(ca.data[li].color[:3]) if (ca is not None and ca.domain == 'CORNER') else (tuple(ca.data[vi].color[:3]) if ca is not None else (1, 1, 1))
            k = (vi, round(n.x, 3), round(n.y, 3), round(n.z, 3), u, poly.material_index)
            if k not in verts:
                verts[k] = len(pos); pos.append((co.x, co.z, -co.y)); nor.append((n.x, n.z, -n.y)); uvs.append(u); col.append(c)
            idx.append(verts[k]); mids.append(poly.material_index)
    P = np.array(pos, np.float32); Nn = np.array(nor, np.float32); U = np.array(uvs, np.float32); I = np.array(idx, np.uint32 if len(pos) > 65535 else np.uint16)
    ent = {'n': len(pos), 'pos': put(P), 'nor': put(Nn), 'uv': put(U), 'idx': put(I), 'i32': len(pos) > 65535,
           'box': [P.min(0).tolist(), P.max(0).tolist()], 'tris': len(idx) // 3}
    if colors: ent['col'] = put((np.clip(np.array(col, np.float32), 0, 1) * 255).astype(np.uint8))
    # 재질별 구간 (같은 재질 삼각형끼리 모아 그린다)
    if len(me.materials) > 1:
        order = np.argsort(np.array(mids[::3], np.int32), kind='stable'); I2 = I.reshape(-1, 3)[order].reshape(-1)
        ent['idx'] = put(I2.astype(I.dtype)); mids_sorted = np.array(mids[::3])[order]
        groups = []
        for mi in range(len(me.materials)):
            s = np.where(mids_sorted == mi)[0]
            if len(s): groups.append([int(s[0]) * 3, int(len(s)) * 3, me.materials[mi].name])
        ent['groups'] = groups
    MAN['meshes'][key] = ent
    return ent

# ───────────────────────── 실행 ─────────────────────────
def build_facades():
    kits = {'brick': style_brick, 'lime': style_lime, 'deco': style_deco, 'glass': style_glass}
    for name, fn in kits.items():
        reset(); MATS.clear()
        k = fn()
        objs = [k['up'], k['gr'], k['co']]
        fe = fire_escape(k['W']) if name == 'brick' else None
        uv_into(k['up'], (0, .5, .5, 1)); uv_into(k['gr'], (.5, .5, 1, 1)); uv_into(k['co'], (0, .25, .5, .5))
        if fe: uv_into(fe, (.5, 0, 1, .5)); objs.append(fe)
        c, ao, orm = bake_atlas(objs, name)
        save_jpg(compose(px(c), px(ao)), os.path.join(OUT, name + '_c.jpg'))
        save_jpg(px(orm), os.path.join(OUT, name + '_m.jpg'), srgb=False)
        pl, fl = bake_flat(k['up'], k['W'], None, name)
        save_jpg(compose(px(fl['c']), px(fl['ao'])), os.path.join(OUT, name + '_fc.jpg'))
        save_jpg(px(fl['m']), os.path.join(OUT, name + '_fm.jpg'), srgb=False)
        for part in ('up', 'gr', 'co'): export(k[part], name + '_' + part)
        export(pl, name + '_fl')
        if fe: export(fe, 'fire_escape')
        MAN['kits'][name] = {'W': k['W'], 'H': H, 'G': G, 'C': C_H, 'T': T}
        print(name, {p: MAN['meshes'][name + '_' + p]['tris'] for p in ('up', 'gr', 'co', 'fl')})

if __name__ == '__main__':
    import sys
    build_facades()
    try:
        import nyc_props; nyc_props.build(globals())
    except ImportError:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import nyc_props; nyc_props.build(globals())
    with open(os.path.join(OUT, 'nyc.bin'), 'wb') as f: f.write(BIN)
    with open(os.path.join(OUT, 'nyc.json'), 'w') as f: json.dump(MAN, f, separators=(',', ':'))
    print('bin', len(BIN))
