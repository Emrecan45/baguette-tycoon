import bpy, bmesh, sys, math, random
from mathutils import Vector, Matrix

OUT = sys.argv[-1]
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

MATS = {}
def M(name, hexcol, rough=0.7, metal=0.0, emit=None, alpha=1.0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*srgb(hexcol), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*srgb(emit), 1)
        b.inputs['Emission Strength'].default_value = 1.5
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    MATS[name] = m
    return m

STONE = M('Stone', '#EBDDC3', 0.85)
STONE2 = M('StoneDark', '#D9C7A6', 0.85)
ZINC = M('Zinc', '#7A8A99', 0.55, 0.3)
ZINC2 = M('ZincDark', '#5E6D7B', 0.55, 0.3)
GLASS = M('WindowGlass', '#3B4D5E', 0.15)
FRAME = M('WindowFrame', '#F4F0E8', 0.6)
IRON = M('Iron', '#22262B', 0.45, 0.4)
BRICK = M('Brick', '#C2603F', 0.85)
BRICKD = M('BrickDark', '#9C4630', 0.85)
TERRA = M('Terracotta', '#C9734F', 0.8)
WOOD = M('Wood', '#B87645', 0.65)
WOODD = M('WoodDark', '#7E4B2A', 0.65)
WOODL = M('WoodLight', '#D9A473', 0.65)
CREAM = M('Cream', '#FFF4DE', 0.7)
SOOT = M('Soot', '#2E2420', 0.9)
EMBER = M('Ember', '#FF9A3C', 0.6, emit='#FF8A2A')
BRASS = M('Brass', '#C9A04A', 0.35, 0.8)
MARBLE = M('Marble', '#F3F0EA', 0.3)
RATTAN = M('Rattan', '#C48A4A', 0.8)
LEAF = M('Leaf', '#5FA84E', 0.8)
LEAF2 = M('Leaf2', '#79BF5A', 0.8)
BARK = M('Bark', '#A39A84', 0.85)
BARK2 = M('Bark2', '#C9C2A8', 0.85)
GREEN = M('ParisGreen', '#2F5D46', 0.5, 0.2)
CRUST = M('Crust', '#D9963F', 0.45)
CRUSTD = M('CrustDark', '#B5722A', 0.45)
GRIGNE = M('Grigne', '#F2D08A', 0.6)
WICKER = M('Wicker', '#B98545', 0.85)
EIFFEL = M('Eiffel', '#7A5A43', 0.6, 0.3)
LAMPGLASS = M('LampGlass', '#FFF1C9', 0.2, emit='#FFE2A0')
BILL = M('Bill', '#6CC56B', 0.6)
BILLD = M('BillDark', '#3E8E41', 0.6)
BILLL = M('BillLight', '#D9F2CF', 0.6)
VITRINE = M('VitrineGlass', '#DDEFF5', 0.05, alpha=0.28)
INTERIOR = M('VitrineBack', '#F7E7CC', 0.8, emit='#3A2A10')
CHOCO = M('Choco', '#5A3524', 0.4)
PINK = M('Macaron', '#F4A6B8', 0.5)
PISTA = M('MacaronGreen', '#B8D98A', 0.5)
RED = M('Red', '#C62E2E', 0.7)
POSTER1 = M('Poster1', '#E8C547', 0.7)
POSTER2 = M('Poster2', '#D9534F', 0.7)
POSTER3 = M('Poster3', '#4A90C2', 0.7)

def deselect():
    for o in bpy.context.selected_objects: o.select_set(False)

def finish(o, mat, bevel=0.0, segs=2, smooth=False):
    o.data.materials.clear(); o.data.materials.append(mat)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel > 0:
        md = o.modifiers.new('B', 'BEVEL'); md.width = bevel; md.segments = segs; md.limit_method = 'ANGLE'
        bpy.ops.object.modifier_apply(modifier='B')
    if smooth:
        bpy.ops.object.shade_smooth()
    else:
        try: bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
        except Exception: bpy.ops.object.shade_flat()
    return o

def box(size, loc, mat, bevel=0.015, rot=(0, 0, 0), segs=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    return finish(o, mat, bevel, segs)

def cyl(r, h, loc, mat, verts=24, rot=(0, 0, 0), bevel=0.0, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=loc, rotation=rot)
    return finish(bpy.context.active_object, mat, bevel)

def sph(r, loc, mat, scale=(1, 1, 1), seg=24, ring=14):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    return finish(o, mat, 0, smooth=True)

def ico(r, loc, mat, scale=(1, 1, 1), sub=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    return finish(o, mat, 0, smooth=False)

def torus(R, r, loc, mat, rot=(0, 0, 0), maj=32, minr=12):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, location=loc, rotation=rot, major_segments=maj, minor_segments=minr)
    return finish(bpy.context.active_object, mat, 0, smooth=True)

def join(objs, name):
    deselect()
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name

    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return o

def mesh_obj(name, verts, faces, mat):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    o.data.materials.append(mat)
    return o

def make_baguette():

    parts = [sph(0.5, (0, 0, 0), CRUST, (0.72, 0.15, 0.115), seg=16, ring=8)]
    for i, x in enumerate((-0.22, -0.075, 0.075, 0.22)):
        g = sph(0.5, (x, 0, 0.042), GRIGNE, (0.19, 0.05, 0.04), seg=8, ring=4)
        g.rotation_euler = (0, 0, math.radians(28)); bpy.ops.object.transform_apply(rotation=True)
        parts.append(g)
    return join(parts, 'P_baguette')

def make_croissant():
    N, K = 64, 14
    A = math.radians(118)
    verts, faces, dark = [], [], []
    def rad(t):
        base = 0.075 * (0.22 + 0.78 * math.sin(math.pi * t) ** 0.85)
        ridge = 1 - 0.16 * (0.5 + 0.5 * math.cos(2 * math.pi * 5 * t))
        return base * ridge, ridge
    for i in range(N + 1):
        t = i / N
        a = -A + 2 * A * t
        cx, cy = math.sin(a) * 0.15, -math.cos(a) * 0.12 + 0.06
        nx, ny = math.sin(a), -math.cos(a)
        l = math.hypot(nx, ny); nx, ny = nx / l, ny / l
        r, ridge = rad(t)
        for k in range(K):
            th = 2 * math.pi * k / K
            ox, oz = math.cos(th) * r, math.sin(th) * r * 0.78
            verts.append((cx + nx * ox, cy + ny * ox, r * 0.78 + oz))
    for i in range(N):
        t = (i + 0.5) / N
        groove = (0.5 + 0.5 * math.cos(2 * math.pi * 5 * t)) > 0.82
        for k in range(K):
            a0, a1 = i * K + k, i * K + (k + 1) % K
            b0, b1 = a0 + K, a1 + K
            faces.append((a0, a1, b1, b0)); dark.append(groove)

    tipA = len(verts); verts.append(verts[0][:2] + (verts[0][2],))
    c0 = [sum(verts[k][j] for k in range(K)) / K for j in range(3)]; verts[tipA] = tuple(c0)
    tipB = len(verts)
    cN = [sum(verts[N * K + k][j] for k in range(K)) / K for j in range(3)]; verts.append(tuple(cN))
    for k in range(K):
        faces.append((tipA, (k + 1) % K, k)); dark.append(True)
        faces.append((tipB, N * K + k, N * K + (k + 1) % K)); dark.append(True)
    o = mesh_obj('P_croissant', verts, faces, CRUST)
    o.data.materials.append(CRUSTD)
    for f, d in zip(o.data.polygons, dark):
        f.material_index = 1 if d else 0
        f.use_smooth = True
    import bmesh
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data); bm.free()
    return o

def make_bill():
    a = box((0.42, 0.24, 0.035), (0, 0, 0), BILL, 0.01)
    b = box((0.43, 0.06, 0.037), (0, 0, 0), BILLL, 0.005)
    c = cyl(0.055, 0.04, (0, 0, 0), BILLD, 20)
    return join([a, b, c], 'P_bill')

def make_oven():
    p = []
    p.append(box((2.0, 1.35, 0.42), (0, 0, 0.21), STONE2, 0.03))
    p.append(box((2.08, 1.43, 0.08), (0, 0, 0.44), STONE, 0.02))
    body = sph(1.0, (0, 0.05, 0.62), BRICK, (0.95, 0.66, 0.92), seg=40, ring=20)
    p.append(body)

    for k in range(5):
        z = 0.75 + k * 0.17
        rr = math.sqrt(max(0.01, 1 - ((z - 0.62) / 0.92) ** 2))
        t = torus(0.95 * rr, 0.018, (0, 0.05, z), BRICKD, maj=40, minr=6)
        t.scale = (1, 0.66 / 0.95, 1); bpy.ops.object.transform_apply(scale=True)
        p.append(t)

    p.append(box((1.5, 0.22, 1.05), (0, -0.55, 0.98), STONE, 0.04))
    p.append(cyl(0.75, 0.22, (0, -0.55, 1.5), STONE, 40, rot=(math.radians(90), 0, 0)))

    p.append(box((0.82, 0.08, 0.42), (0, -0.67, 0.86), SOOT, 0.02))
    p.append(cyl(0.41, 0.08, (0, -0.67, 1.07), SOOT, 32, rot=(math.radians(90), 0, 0)))
    p.append(box((0.66, 0.05, 0.22), (0, -0.7, 0.8), EMBER, 0.02))
    p.append(sph(0.5, (0, -0.69, 0.93), EMBER, (0.5, 0.06, 0.18)))

    for i in range(9):
        a = math.radians(180 * i / 8)
        x, z = math.cos(a) * 0.52, 1.07 + math.sin(a) * 0.52
        v = box((0.14, 0.1, 0.2), (x, -0.68, z), STONE2, 0.02, rot=(0, -a + math.pi / 2, 0))
        p.append(v)
    p.append(box((1.0, 0.18, 0.08), (0, -0.72, 0.66), STONE2, 0.02))

    p.append(box((0.5, 0.05, 0.4), (0.62, -0.71, 0.75), IRON, 0.02, rot=(0, math.radians(8), 0)))
    p.append(cyl(0.035, 0.08, (0.62, -0.75, 0.82), BRASS, 12, rot=(math.radians(90), 0, 0)))

    p.append(cyl(0.13, 0.85, (0.42, 0.3, 1.8), IRON, 20))
    p.append(cyl(0.18, 0.06, (0.42, 0.3, 2.24), IRON, 20))
    p.append(cyl(0.16, 0.04, (0.42, 0.3, 1.4), BRASS, 20))
    return join(p, 'P_oven')

def make_table():
    p = [box((1.8, 0.78, 0.1), (0, 0, 0.79), WOOD, 0.025)]
    for lx in (-0.8, 0.8):
        for ly in (-0.3, 0.3):
            p.append(cyl(0.045, 0.74, (lx, ly, 0.37), WOODD, 12, bevel=0.0))
    p.append(box((1.6, 0.6, 0.04), (0, 0, 0.18), WOODD, 0.01))
    p.append(box((0.5, 0.35, 0.3), (-0.45, 0, 0.36), CREAM, 0.12))
    p.append(box((0.42, 0.3, 0.26), (0.35, 0.05, 0.34), WICKER, 0.06))
    return join(p, 'P_table')

def make_counter():
    p = []
    p.append(box((3.0, 0.95, 0.12), (0, 0, 0.06), WOODD, 0.02))
    p.append(box((2.95, 0.9, 0.85), (0, 0, 0.52), CREAM, 0.03))

    for x in (0.85, 1.25):
        p.append(box((0.34, 0.03, 0.55), (x, -0.46, 0.52), WOODL, 0.012))

    p.append(box((1.7, 0.05, 0.62), (-0.55, -0.3, 0.52), INTERIOR, 0.01))
    p.append(box((1.72, 0.32, 0.03), (-0.55, -0.44, 0.48), WOODL, 0.008))
    p.append(box((1.8, 0.04, 0.72), (-0.55, -0.465, 0.52), WOODD, 0.0))
    p.append(box((1.68, 0.02, 0.64), (-0.55, -0.49, 0.52), VITRINE, 0.0))

    for i in range(6):
        x = -1.25 + i * 0.28
        c = make_croissant(); c.location = (x, -0.4, 0.5); c.scale = (0.55, 0.55, 0.55)
        bpy.ops.object.transform_apply(location=True, scale=True); p.append(c)
        e = sph(0.5, (x + 0.02, -0.4, 0.29), CRUST, (0.2, 0.06, 0.05), seg=10, ring=6); p.append(e)
        p.append(sph(0.5, (x + 0.02, -0.4, 0.32), CHOCO, (0.19, 0.05, 0.02), seg=10, ring=4))
        p.append(cyl(0.035, 0.035, (x + 0.12, -0.44, 0.68), PINK if i % 2 else PISTA, 16))
    p.append(box((3.2, 1.15, 0.14), (0, 0, 1.0), WOOD, 0.03))

    p.append(box((0.5, 0.42, 0.24), (1.15, 0.12, 1.19), BRASS, 0.04))
    p.append(box((0.5, 0.28, 0.16), (1.15, 0.0, 1.32), BRASS, 0.04, rot=(math.radians(-25), 0, 0)))
    for i in range(3):
        for j in range(4):
            p.append(cyl(0.025, 0.03, (1.0 + j * 0.1, -0.06 + i * 0.07, 1.39 + i * 0.03), CREAM, 10, rot=(math.radians(-25), 0, 0)))
    p.append(box((0.36, 0.06, 0.2), (1.15, 0.22, 1.48), BRASS, 0.02))
    p.append(box((0.26, 0.07, 0.1), (1.15, 0.19, 1.5), SOOT, 0.01))
    p.append(cyl(0.03, 0.18, (1.45, 0.12, 1.2), BRASS, 10, rot=(0, math.radians(90), 0)))
    return join(p, 'P_counter')

def make_bread_shelf():
    p = []
    p.append(box((1.7, 0.42, 0.06), (0, 0, 0.05), WOODD, 0.015))
    for side in (-0.83, 0.83):
        p.append(box((0.06, 0.45, 2.1), (side, 0, 1.05), WOOD, 0.015))
    p.append(box((1.72, 0.06, 2.1), (0, 0.2, 1.05), WOODL, 0.01))
    for z in (0.75, 1.45, 2.1):
        p.append(box((1.72, 0.46, 0.06), (0, 0, z), WOOD, 0.015))

    for i, x in enumerate((-0.5, 0.0, 0.5)):
        p.append(cyl(0.18, 0.32, (x, -0.02, 0.26), WICKER, 18, r2=0.21))
        for k in range(4):
            b = make_baguette()
            b.scale = (0.85, 0.85, 0.85)
            b.rotation_euler = (math.radians(random.uniform(-8, 8)), math.radians(-90 + random.uniform(-12, 12)), math.radians(random.uniform(0, 180)))
            b.location = (x + random.uniform(-0.07, 0.07), -0.02 + random.uniform(-0.06, 0.06), 0.52)
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
            p.append(b)

    for i, x in enumerate((-0.55, -0.2, 0.15, 0.5)):
        p.append(sph(0.5, (x, -0.03, 0.88), CRUST if i % 2 else CRUSTD, (0.28, 0.24, 0.16)))
        g = sph(0.5, (x, -0.03, 0.95), GRIGNE, (0.18, 0.03, 0.02)); p.append(g)
    for i, x in enumerate((-0.6, -0.3, 0.0, 0.3, 0.6)):
        c = make_croissant(); c.location = (x, -0.05, 1.48); c.scale = (0.7, 0.7, 0.7)
        bpy.ops.object.transform_apply(location=True, scale=True); p.append(c)
    return join(p, 'P_bread_shelf')

def make_lamp():
    p = []
    p.append(cyl(0.2, 0.1, (0, 0, 0.05), IRON, 16))
    p.append(cyl(0.16, 0.5, (0, 0, 0.35), IRON, 16, r2=0.09))
    p.append(torus(0.1, 0.03, (0, 0, 0.62), IRON))
    p.append(cyl(0.05, 2.6, (0, 0, 1.95), IRON, 12, r2=0.035))
    p.append(torus(0.06, 0.02, (0, 0, 2.2), IRON))
    p.append(cyl(0.1, 0.12, (0, 0, 3.3), IRON, 12))

    p.append(cyl(0.15, 0.06, (0, 0, 3.4), IRON, 6))
    p.append(cyl(0.2, 0.4, (0, 0, 3.63), LAMPGLASS, 6, r2=0.24))
    p.append(cyl(0.27, 0.22, (0, 0, 3.94), IRON, 6, r2=0.06))
    p.append(sph(0.05, (0, 0, 4.1), IRON))
    for a in range(6):
        ang = math.radians(a * 60 + 30)
        p.append(box((0.02, 0.02, 0.42), (math.cos(ang) * 0.215, math.sin(ang) * 0.215, 3.63), IRON, 0.0, rot=(0, 0, ang)))
    return join(p, 'P_lamp')

def make_planetree():
    p = []
    p.append(box((1.1, 1.1, 0.04), (0, 0, 0.02), IRON, 0.01))
    p.append(cyl(0.16, 3.2, (0, 0, 1.6), BARK, 14, r2=0.11))
    for k in range(6):
        a = random.uniform(0, 6.28); z = random.uniform(0.4, 2.8)
        p.append(sph(0.5, (math.cos(a) * 0.13, math.sin(a) * 0.13, z), BARK2, (0.12, 0.12, 0.22)))
    p.append(cyl(0.07, 1.0, (0.3, 0, 3.1), BARK, 10, rot=(0, math.radians(35), 0)))
    p.append(cyl(0.07, 1.0, (-0.25, 0.1, 3.15), BARK, 10, rot=(0, math.radians(-32), 0)))
    blobs = [(0, 0, 4.0, 1.5), (0.9, 0.3, 3.7, 1.05), (-0.85, -0.2, 3.75, 1.1), (0.2, -0.8, 3.8, 1.0), (-0.2, 0.85, 3.9, 1.0), (0.1, 0.1, 4.7, 1.0)]
    for i, (x, y, z, r) in enumerate(blobs):
        p.append(ico(r, (x, y, z), LEAF if i % 2 == 0 else LEAF2, (1, 1, 0.85), sub=2))
    return join(p, 'P_planetree')

def make_cafe_set():
    p = []

    p.append(cyl(0.33, 0.035, (0, 0, 0.74), MARBLE, 28, bevel=0.01))
    p.append(cyl(0.035, 0.7, (0, 0, 0.38), IRON, 10))
    p.append(cyl(0.22, 0.04, (0, 0, 0.03), IRON, 16))

    for side in (-1, 1):
        cx = side * 0.62
        p.append(cyl(0.2, 0.05, (cx, 0, 0.46), RATTAN, 20, bevel=0.01))
        for lx in (-0.13, 0.13):
            for ly in (-0.13, 0.13):
                p.append(cyl(0.015, 0.45, (cx + lx, ly, 0.22), IRON, 8))
        t = torus(0.17, 0.025, (cx + side * 0.17, 0, 0.72), RATTAN, rot=(0, math.radians(90), 0), maj=24, minr=8)
        p.append(t)

    p.append(cyl(0.04, 0.05, (0.1, 0.05, 0.78), CREAM, 12))
    p.append(cyl(0.035, 0.05, (-0.12, -0.06, 0.78), CREAM, 12))
    return join(p, 'P_cafe_set')

def make_morris():
    p = []
    p.append(cyl(0.62, 0.25, (0, 0, 0.12), GREEN, 28, bevel=0.02))
    p.append(cyl(0.52, 2.2, (0, 0, 1.35), GREEN, 28))
    cols = [POSTER1, POSTER2, POSTER3, CREAM, POSTER1, POSTER3]
    for i in range(6):
        a = math.radians(i * 60)
        p.append(box((0.48, 0.02, 1.2), (math.cos(a) * 0.53, math.sin(a) * 0.53, 1.35), cols[i], 0.0, rot=(0, 0, a + math.pi / 2)))
    p.append(cyl(0.62, 0.12, (0, 0, 2.5), GREEN, 28, bevel=0.02))
    s = sph(0.55, (0, 0, 2.6), GREEN, (1, 1, 0.55)); p.append(s)
    p.append(cyl(0.05, 0.4, (0, 0, 3.05), GREEN, 10))
    p.append(sph(0.08, (0, 0, 3.3), BRASS))
    return join(p, 'P_morris')

def make_haussmann(name, w=8.0, d=7.0, floors=3, awning=RED, seed=0):
    random.seed(seed)
    p = []
    g_h, f_h = 3.4, 2.7
    top = g_h + floors * f_h
    p.append(box((w, d, top), (0, d / 2, top / 2), STONE, 0.0))

    p.append(box((w + 0.04, 0.08, g_h), (0, -0.02, g_h / 2), STONE2, 0.0))
    nshop = max(1, int(w // 3.2))
    for i in range(nshop):
        x = -w / 2 + (i + 0.5) * w / nshop
        sw = w / nshop - 0.8
        p.append(box((sw, 0.1, 2.3), (x, -0.07, 1.45), GLASS, 0.0))
        p.append(box((sw + 0.16, 0.12, 0.12), (x, -0.08, 2.65), WOODD, 0.0))

        nst = 7
        for k in range(nst):
            sx = x - sw / 2 + (k + 0.5) * sw / nst
            p.append(box((sw / nst, 0.9, 0.04), (sx, -0.5, 2.85), awning if k % 2 == 0 else CREAM, 0.0, rot=(math.radians(-18), 0, 0)))
        for k in range(nst):
            sx = x - sw / 2 + (k + 0.5) * sw / nst
            p.append(box((sw / nst, 0.03, 0.18), (sx, -0.93, 2.65), awning if k % 2 == 0 else CREAM, 0.0))

    nwin = max(2, int(w // 1.6))
    for f in range(floors):
        z0 = g_h + f * f_h
        p.append(box((w + 0.12, 0.22, 0.14), (0, -0.05, z0 + 0.05), STONE2, 0.02))
        full_balcony = f in (0, floors - 1)
        if full_balcony:
            p.append(box((w - 0.2, 0.55, 0.08), (0, -0.25, z0 + 0.15), STONE2, 0.01))
            p.append(box((w - 0.2, 0.03, 0.04), (0, -0.52, z0 + 1.05), IRON, 0.0))
            for k in range(int((w - 0.2) / 0.12)):
                p.append(box((0.018, 0.018, 0.85), (-w / 2 + 0.15 + k * 0.12, -0.52, z0 + 0.6), IRON, 0.0))
        for i in range(nwin):
            x = -w / 2 + (i + 0.5) * w / nwin
            p.append(box((0.82, 0.08, 1.72), (x, -0.03, z0 + 1.22), FRAME, 0.0))
            p.append(box((0.68, 0.1, 1.58), (x, -0.04, z0 + 1.22), GLASS, 0.0))
            p.append(box((0.04, 0.11, 1.58), (x, -0.045, z0 + 1.22), FRAME, 0.0))
            p.append(box((0.68, 0.11, 0.04), (x, -0.045, z0 + 1.55), FRAME, 0.0))
            p.append(box((0.98, 0.16, 0.1), (x, -0.06, z0 + 2.15), STONE2, 0.01))
            if not full_balcony:
                p.append(box((0.9, 0.3, 0.06), (x, -0.15, z0 + 0.32), STONE2, 0.01))
                p.append(box((0.9, 0.02, 0.03), (x, -0.29, z0 + 0.82), IRON, 0.0))
                for k in range(7):
                    p.append(box((0.016, 0.016, 0.48), (x - 0.4 + k * 0.133, -0.29, z0 + 0.58), IRON, 0.0))

    p.append(box((w + 0.3, d + 0.3, 0.25), (0, d / 2, top + 0.1), STONE2, 0.03))
    m_h = 2.2
    v = [(-w / 2, -0.1, top + 0.2), (w / 2, -0.1, top + 0.2), (w / 2, d + 0.1, top + 0.2), (-w / 2, d + 0.1, top + 0.2),
         (-w / 2 + 0.9, 0.9, top + 0.2 + m_h), (w / 2 - 0.9, 0.9, top + 0.2 + m_h), (w / 2 - 0.9, d - 0.9, top + 0.2 + m_h), (-w / 2 + 0.9, d - 0.9, top + 0.2 + m_h)]
    f = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)]
    roof = mesh_obj('roof', v, f, ZINC)
    p.append(roof)
    for i in range(nwin):
        x = -w / 2 + (i + 0.5) * w / nwin
        if abs(x) > w / 2 - 0.9: continue
        p.append(box((0.7, 0.9, 1.0), (x, 0.35, top + 0.85), ZINC2, 0.02))
        p.append(box((0.5, 0.1, 0.62), (x, -0.08, top + 0.8), FRAME, 0.0))
        p.append(box((0.38, 0.11, 0.5), (x, -0.09, top + 0.8), GLASS, 0.0))
        p.append(cyl(0.38, 0.9, (x, 0.35, top + 1.35), ZINC2, 16, rot=(math.radians(90), 0, 0)))
    for k in range(3):
        cx = -w / 2 + 1.4 + k * (w - 2.8) / 2
        cy = d / 2 + random.uniform(-1, 1)
        p.append(box((0.9, 0.5, 1.4), (cx, cy, top + m_h + 0.6), BRICK, 0.02))
        p.append(box((1.0, 0.6, 0.1), (cx, cy, top + m_h + 1.3), STONE2, 0.01))
        for j in range(3):
            p.append(cyl(0.09, 0.32, (cx - 0.28 + j * 0.28, cy, top + m_h + 1.5), TERRA, 10))
    return join(p, name)

def lattice_tube(rings, mat, thickness, name):
    """rings : liste de (z, cx, cy, half) carrés empilés, reliés en treillis."""
    verts, faces = [], []
    sub = 4
    for (z, cx, cy, h) in rings:
        for side in range(4):
            for k in range(sub):
                t = k / sub
                if side == 0: x, y = -h + 2 * h * t, -h
                elif side == 1: x, y = h, -h + 2 * h * t
                elif side == 2: x, y = h - 2 * h * t, h
                else: x, y = -h, h - 2 * h * t
                verts.append((cx + x, cy + y, z))
    n = 4 * sub
    for r in range(len(rings) - 1):
        for k in range(n):
            a, b = r * n + k, r * n + (k + 1) % n
            faces.append((a, b, b + n))
            faces.append((a, b + n, a + n))
    o = mesh_obj(name, verts, faces, mat)
    deselect(); o.select_set(True); bpy.context.view_layer.objects.active = o
    md = o.modifiers.new('W', 'WIREFRAME'); md.thickness = thickness; md.use_relative_offset = False
    bpy.ops.object.modifier_apply(modifier='W')
    return o

def make_eiffel():

    p = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            rings = []
            for i in range(10):
                t = i / 9
                z = t * 0.17
                c = 0.19 - t * 0.085 - 0.02 * math.sin(t * math.pi)
                rings.append((z, sx * c, sy * c, 0.042 - t * 0.014))
            p.append(lattice_tube(rings, EIFFEL, 0.0032, 'leg'))

    for a in range(4):
        ang = math.radians(90 * a)
        t = torus(0.1, 0.006, (0.15 * math.sin(ang), -0.15 * math.cos(ang), 0.035), EIFFEL, rot=(math.radians(90), 0, ang), maj=28, minr=6)
        bm = bmesh.new(); bm.from_mesh(t.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.002 + (0 if True else 0) and False], context='VERTS')
        bm.to_mesh(t.data); bm.free()
        p.append(t)
    p.append(box((0.235, 0.235, 0.02), (0, 0, 0.175), EIFFEL, 0.003))
    p.append(box((0.25, 0.25, 0.006), (0, 0, 0.187), EIFFEL, 0.0))
    rings = []
    for i in range(10):
        t = i / 9
        rings.append((0.185 + t * 0.16, 0, 0, 0.1 - t * 0.045))
    p.append(lattice_tube(rings, EIFFEL, 0.0028, 'mid'))
    p.append(box((0.13, 0.13, 0.014), (0, 0, 0.35), EIFFEL, 0.002))
    rings = []
    for i in range(20):
        t = i / 19
        rings.append((0.355 + t * 0.55, 0, 0, 0.05 * (1 - t) ** 1.5 + 0.006))
    p.append(lattice_tube(rings, EIFFEL, 0.0022, 'top'))
    p.append(box((0.03, 0.03, 0.025), (0, 0, 0.915), EIFFEL, 0.002))
    p.append(cyl(0.004, 0.08, (0, 0, 0.965), EIFFEL, 8))
    return join(p, 'P_eiffel')

def make_far_block():
    p = [box((10, 10, 14), (0, 0, 7), STONE, 0.0)]
    v = [(-5, -5, 14), (5, -5, 14), (5, 5, 14), (-5, 5, 14), (-4, -4, 16.5), (4, -4, 16.5), (4, 4, 16.5), (-4, 4, 16.5)]
    p.append(mesh_obj('r', v, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)], ZINC))
    for f in range(4):
        for i in range(5):
            p.append(box((0.9, 0.1, 1.6), (-4 + i * 2, -5.02, 3.5 + f * 2.7), GLASS, 0.0))
    return join(p, 'P_far_block')

objs = [make_baguette(), make_croissant(), make_bill(), make_oven(), make_table(), make_counter(), make_bread_shelf()]

keep = set(o.name for o in objs)
for o in list(bpy.data.objects):
    if o.name not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
for o in objs:
    print(o.name, len(o.data.vertices), 'verts', [m.name for m in o.data.materials][:8])
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_materials='EXPORT', export_yup=True)
print('OK', OUT)
