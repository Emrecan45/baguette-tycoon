import bpy, bmesh, sys, math
from mathutils import Vector

OUT = sys.argv[-1]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def mat(name, rgb, rough=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    return m

def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)

M_SKIN = mat('Skin', srgb('#F8AE6C'), 0.42)
M_SHIRT = mat('Shirt', srgb('#3D7DDB'), 0.6)
M_PANTS = mat('Pants', srgb('#2F3B55'), 0.65)
M_SHOES = mat('Shoes', srgb('#2B2B2B'), 0.5)
M_WHITE = mat('Hat', srgb('#FFFFFF'), 0.6)

P = {
    'pelvis': ((0, 0, 0.585), 0.235, 0.19),
    'waist': ((0, 0, 0.73), 0.24, 0.195),
    'chest': ((0, 0, 0.895), 0.26, 0.205),
    'neck': ((0, 0, 1.02), 0.17, 0.15),
}
for s, n in ((-1, 'L'), (1, 'R')):
    P['shoulder' + n] = ((s * 0.24, 0, 0.955), 0.102, 0.1)
    P['elbow' + n] = ((s * 0.33, 0.0, 0.765), 0.09, 0.088)
    P['wrist' + n] = ((s * 0.37, -0.01, 0.605), 0.082, 0.08)
    P['hand' + n] = ((s * 0.385, -0.015, 0.53), 0.112, 0.102)
    P['handTip' + n] = ((s * 0.39, -0.015, 0.475), 0.072, 0.066)
    P['hip' + n] = ((s * 0.12, 0, 0.55), 0.13, 0.125)
    P['knee' + n] = ((s * 0.125, -0.005, 0.32), 0.118, 0.115)
    P['ankle' + n] = ((s * 0.125, 0.0, 0.13), 0.105, 0.105)
    P['heel' + n] = ((s * 0.125, 0.02, 0.075), 0.1, 0.085)
    P['toe' + n] = ((s * 0.125, -0.13, 0.075), 0.1, 0.08)

EDGES = [('pelvis', 'waist'), ('waist', 'chest'), ('chest', 'neck')]
for n in 'LR':
    EDGES += [('chest', 'shoulder' + n), ('shoulder' + n, 'elbow' + n), ('elbow' + n, 'wrist' + n),
              ('wrist' + n, 'hand' + n), ('hand' + n, 'handTip' + n),
              ('pelvis', 'hip' + n), ('hip' + n, 'knee' + n), ('knee' + n, 'ankle' + n), ('ankle' + n, 'heel' + n), ('heel' + n, 'toe' + n)]

names = list(P)
me = bpy.data.meshes.new('BodySkel')
me.from_pydata([P[n][0] for n in names], [(names.index(a), names.index(b)) for a, b in EDGES], [])
body = bpy.data.objects.new('Body', me)
scene.collection.objects.link(body)
bpy.context.view_layer.objects.active = body
body.select_set(True)
skin = body.modifiers.new('Skin', 'SKIN')
skin.use_smooth_shade = True
skin.branch_smoothing = 0.6
for i, n in enumerate(names):
    sv = me.skin_vertices[0].data[i]
    sv.radius = (P[n][1], P[n][2])
    if n == 'pelvis':
        sv.use_root = True
sub = body.modifiers.new('Sub', 'SUBSURF')
sub.levels = 1
bpy.ops.object.modifier_apply(modifier='Skin')
bpy.ops.object.modifier_apply(modifier='Sub')

bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=14, radius=0.31, location=(0, -0.01, 1.30))
head = bpy.context.active_object
head.scale = (1.0, 0.98, 0.96)
bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.shade_smooth()

body.data.materials.append(M_SKIN)
body.data.materials.append(M_SHIRT)
body.data.materials.append(M_PANTS)
body.data.materials.append(M_SHOES)
bm = bmesh.new()
bm.from_mesh(body.data)
sh = {n: Vector(P['shoulder' + n][0]) for n in 'LR'}
el = {n: Vector(P['elbow' + n][0]) for n in 'LR'}
WAIST_Z, SHOE_Z, SLEEVE_T = 0.70, 0.17, 0.5

def cut(co, no):
    g = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=g, plane_co=co, plane_no=no)
cut((0, 0, WAIST_Z), (0, 0, 1))
cut((0, 0, SHOE_Z), (0, 0, 1))
for n in 'LR':
    cut(sh[n] + (el[n] - sh[n]) * SLEEVE_T, (el[n] - sh[n]).normalized())
for f in bm.faces:
    c = f.calc_center_median()
    side = 'L' if c.x < 0 else 'R'
    ax = abs(c.x)
    a_, b_ = sh[side], el[side]
    t = (c - a_).dot(b_ - a_) / (b_ - a_).length_squared
    hd = Vector(P['handTip' + side][0])
    def segd(p, q):
        u = q - p; k = max(0.0, min(1.0, (c - p).dot(u) / u.length_squared)); return (c - (p + u * k)).length
    on_arm = min(segd(a_, b_), segd(b_, hd)) < 0.13 and ax > 0.18
    if c.z < SHOE_Z and not on_arm:
        f.material_index = 3
    elif on_arm:
        f.material_index = 1 if t < SLEEVE_T else 0
    elif c.z > WAIST_Z:
        f.material_index = 1
    else:
        f.material_index = 2
bm.to_mesh(body.data)
bm.free()
head.data.materials.append(M_SKIN)

bpy.ops.object.select_all(action='DESELECT')
head.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body.name = 'Character'

def finish(obj, name, m):
    obj.name = name
    obj.data.materials.clear()
    obj.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return obj

bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.225, depth=0.13, location=(0, -0.01, 1.54))
band = bpy.context.active_object
bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=10, radius=0.28, location=(0, -0.01, 1.70))
puff = bpy.context.active_object
puff.scale = (1, 1, 0.68)
for dx, dy in ((-0.13, -0.05), (0.13, 0.04), (0.02, 0.13), (-0.04, -0.14)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.155, location=(dx, dy - 0.01, 1.71))
bpy.ops.object.select_all(action='DESELECT')
for o in list(bpy.data.objects):
    if o.name.startswith(('Cylinder', 'Sphere')):
        o.select_set(True)
bpy.context.view_layer.objects.active = band
bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.join()
toque = finish(bpy.context.active_object, 'Hat_Toque', M_WHITE)

M_CAP = mat('Cap', srgb('#E53935'), 0.6)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.328, location=(0, -0.01, 1.33))
cap = bpy.context.active_object
bm = bmesh.new(); bm.from_mesh(cap.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 0.02], context='VERTS')
bm.to_mesh(cap.data); bm.free()
solid = cap.modifiers.new('Solid', 'SOLIDIFY'); solid.thickness = 0.02
bpy.ops.object.modifier_apply(modifier='Solid')
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.22, depth=0.05, location=(0, -0.29, 1.345))
brim = bpy.context.active_object
brim.scale = (1.05, 0.9, 1)
brim.rotation_euler = (math.radians(-8), 0, 0)
bpy.ops.object.transform_apply(scale=True, rotation=True)
bpy.ops.object.select_all(action='DESELECT')
cap.select_set(True); brim.select_set(True)
bpy.context.view_layer.objects.active = cap
bpy.ops.object.join()
finish(cap, 'Hat_Cap', M_CAP)

M_HAIR = mat('Hair', srgb('#4E342E'), 0.7)
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.322, location=(0, 0.0, 1.32))
hair = bpy.context.active_object
bm = bmesh.new(); bm.from_mesh(hair.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.02 or (v.co.y < -0.12 and v.co.z < 0.12)], context='VERTS')
bm.to_mesh(hair.data); bm.free()
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.115, location=(0, 0.28, 1.45))
bun = bpy.context.active_object
bpy.ops.object.select_all(action='DESELECT')
hair.select_set(True); bun.select_set(True)
bpy.context.view_layer.objects.active = hair
bpy.ops.object.join()
finish(hair, 'Hat_Hair', M_HAIR)

arm_data = bpy.data.armatures.new('Rig')
rig = bpy.data.objects.new('Rig', arm_data)
scene.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones

def bone(name, head, tail, parent=None):
    b = eb.new(name)
    b.head = head
    b.tail = tail
    b.roll = 0
    if parent:
        b.parent = eb[parent]
        b.use_connect = False
    return b

bone('hips', (0, 0, 0.55), (0, 0, 0.73))
bone('spine', (0, 0, 0.73), (0, 0, 1.0), 'hips')
bone('head', (0, 0, 1.03), (0, 0, 1.6), 'spine')
for s, n in ((-1, 'L'), (1, 'R')):
    bone('upperarm' + n, P['shoulder' + n][0], P['elbow' + n][0], 'spine')
    bone('forearm' + n, P['elbow' + n][0], P['hand' + n][0], 'upperarm' + n)
    bone('thigh' + n, P['hip' + n][0], P['knee' + n][0], 'hips')
    bone('shin' + n, P['knee' + n][0], P['ankle' + n][0], 'thigh' + n)
    bone('foot' + n, P['ankle' + n][0], P['toe' + n][0], 'shin' + n)
bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

for h in (toque, cap, hair):
    bpy.ops.object.select_all(action='DESELECT')
    h.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    rig.data.bones.active = rig.data.bones['head']
    bpy.ops.object.mode_set(mode='POSE')
    bpy.ops.object.mode_set(mode='OBJECT')
    mw = h.matrix_world.copy()
    h.parent = rig
    h.parent_type = 'BONE'
    h.parent_bone = 'head'
    h.matrix_world = mw

print('verts body:', len(body.data.vertices), 'groups:', [g.name for g in body.vertex_groups])
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_animations=False,
                          export_skins=True, export_yup=True, export_materials='EXPORT')
print('OK', OUT)
