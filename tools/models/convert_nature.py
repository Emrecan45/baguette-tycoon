import bpy, sys, os, math
from mathutils import Matrix, Vector
FBX, TEX, OUT = sys.argv[-3], sys.argv[-2], sys.argv[-1]
NAMES = ['NormalTree_1', 'NormalTree_2', 'NormalTree_3', 'MapleTree_1', 'MapleTree_3', 'BirchTree_2', 'PineTree_2',
         'Bush', 'Bush_Flowers', 'Bush_Large', 'Bush_Large_Flowers', 'Bush_Small_Flowers',
         'Flower_1_Clump', 'Flower_2_Clump', 'Flower_3_Clump', 'Flower_4_Clump', 'Grass_Small', 'Grass_Large', 'Plant_Flowers', 'Rock_1', 'Rock_3']
TEXMAP = {'Rock': 'Rocks.png'}
bpy.ops.wm.read_factory_settings(use_empty=True)
for n in NAMES:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=os.path.join(FBX, n + '.fbx'))
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == 'MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1: bpy.ops.object.join()
    m = bpy.context.view_layer.objects.active
    m.name = 'N_' + n
    for o in new:
        if o.name in bpy.data.objects and o != m and o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)

    me = m.data
    vs = [v.co.copy() for v in me.vertices]
    ext = [max(v[i] for v in vs) - min(v[i] for v in vs) for i in range(3)]
    if 'Tree' in n and ext[1] > ext[2] * 1.15:
        me.transform(Matrix.Rotation(math.radians(90), 4, 'X'))
    vs = [v.co for v in me.vertices]
    zmin, zmax = min(v.z for v in vs), max(v.z for v in vs)
    mean = sum(v.z for v in vs) / len(vs)
    if 'Tree' in n and mean < (zmin + zmax) / 2 - 0.05 * (zmax - zmin):
        me.transform(Matrix.Rotation(math.radians(180), 4, 'X'))

    vs = [v.co for v in me.vertices]
    zmin = min(v.z for v in vs)
    cx = (min(v.x for v in vs) + max(v.x for v in vs)) / 2
    cy = (min(v.y for v in vs) + max(v.y for v in vs)) / 2
    me.transform(Matrix.Translation(Vector((-cx, -cy, -zmin))))
    m.location = (0, 0, 0)

imgs = {}
for mat in bpy.data.materials:
    base = mat.name.split('.')[0]
    fn = TEXMAP.get(base, base + '.png')
    path = os.path.join(TEX, fn)
    if not os.path.exists(path):
        print('no texture for', mat.name); continue
    if fn not in imgs: imgs[fn] = bpy.data.images.load(path)
    nt = mat.node_tree
    for nd in [nd for nd in nt.nodes if nd.type == 'NORMAL_MAP']: nt.nodes.remove(nd)
    bsdf = next(nd for nd in nt.nodes if nd.type == 'BSDF_PRINCIPLED')
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = imgs[fn]
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.9
    bsdf.inputs['Metallic'].default_value = 0
    if any(k in base for k in ('Leaves', 'Flowers', 'Grass')):
        nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
        try: mat.blend_method = 'CLIP'
        except Exception: pass
for o in bpy.data.objects:
    print(o.name, [round(v, 2) for v in o.dimensions])
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_apply=True, export_image_format='AUTO')
print('OK')
