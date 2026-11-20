"""Engineering Observatory: library pull-back (v1).

The last chapter of the film: the camera starts on a monitor showing the Folio catalogue (the portfolio's own
screenshot of the application) and pulls back to reveal a reader at a desk in a modern library, the place a
library system is for. A conceptual illustration: the person is an anonymous, stylised figure seen from
behind, not a real individual, and the setting is invented.

Shares render settings, world, materials and builders with pipeline_scene.py (executed up to its first chapter).
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(HERE, "pipeline_scene.py"), encoding="utf-8").read()
_cut = _src.rfind("# -----", 0, _src.index("# 0. Display crossing"))
exec(compile(_src[:_cut], os.path.join(HERE, "pipeline_scene.py"), "exec"))

GENERATOR = "blender/scripts/library_scene.py (v1.1 reader detail)"
N_FRAMES = 150
T_START, T_END = 7.62, 8.85
scene.frame_start, scene.frame_end = 0, N_FRAMES - 1
for o in [o for o in bpy.data.objects if o.type == "LIGHT" and o.data.type == "SUN"]:
    bpy.data.objects.remove(o)
scene.view_settings.exposure = 0.0
world.mist_settings.start, world.mist_settings.depth = 6.0, 60.0
# Warmer interior HDRI for reflections and ambience.
_hdri = os.path.join(ASSET_ROOT, "hdri", "st_fagans_interior_2k.hdr")
for n in world.node_tree.nodes:
    if n.type == "TEX_ENVIRONMENT" and os.path.exists(_hdri):
        n.image = bpy.data.images.load(_hdri, check_existing=True)
    if n.type == "BACKGROUND" and n.inputs["Strength"].default_value == HDRI_STRENGTH:
        n.inputs["Strength"].default_value = 0.55

WOOD = pbr("Oak floor (scan)", "wood_floor", tile=2.2, tint=(0.95, 0.9, 0.85), rough=(0.25, 0.6), normal=0.5, fallback=(0.4, 0.28, 0.18))
WALNUT = pbr("Walnut (scan)", "wood_floor", tile=1.2, tint=(0.42, 0.3, 0.22), rough=(0.3, 0.55), normal=0.3, fallback=(0.2, 0.13, 0.09))
PLASTER = principled("Plaster", (0.74, 0.72, 0.68), roughness=0.85)
FABRIC = principled("Chair fabric", (0.08, 0.085, 0.09), roughness=0.9)
def fabric_detail(mat, scale, strength, stretch=(1.0, 1.0, 1.0), wave=False, tint=None):
    """Surface detail for the reader: knit ribbing (wave bands) or hair strands (stretched noise), plus colour variation."""
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = stretch
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    if wave:
        tex = nt.nodes.new("ShaderNodeTexWave")
        tex.wave_type, tex.bands_direction = "BANDS", "X"
        tex.inputs["Scale"].default_value = scale
        tex.inputs["Distortion"].default_value = 1.5
        out = tex.outputs["Fac"]
    else:
        tex = nt.nodes.new("ShaderNodeTexNoise")
        tex.inputs["Scale"].default_value = scale
        tex.inputs["Detail"].default_value = 8.0
        out = tex.outputs["Fac"]
    nt.links.new(mp.outputs["Vector"], tex.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    bump.inputs["Distance"].default_value = 0.002
    nt.links.new(out, bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    if tint:
        var = nt.nodes.new("ShaderNodeTexNoise")
        var.inputs["Scale"].default_value = 9.0
        nt.links.new(tc.outputs["Object"], var.inputs["Vector"])
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.inputs[6].default_value, mix.inputs[7].default_value = (*tint[0], 1), (*tint[1], 1)
        nt.links.new(var.outputs["Fac"], mix.inputs["Factor"])
        nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    return mat


KNIT = fabric_detail(principled("Knit jumper", (0.12, 0.15, 0.2), roughness=0.95), 140.0, 0.35, wave=True,
                     tint=((0.09, 0.11, 0.15), (0.17, 0.2, 0.26)))
try_set(KNIT.node_tree.nodes["Principled BSDF"].inputs["Sheen Weight"], "default_value", 0.7)
SKIN = principled("Skin", (0.62, 0.43, 0.33), roughness=0.45)
try_set(SKIN.node_tree.nodes["Principled BSDF"].inputs["Subsurface Weight"], "default_value", 0.2)
HAIR = fabric_detail(principled("Hair", (0.05, 0.035, 0.03), roughness=0.36, coat=0.15), 18.0, 0.5, stretch=(28.0, 28.0, 2.5),
                     tint=((0.035, 0.025, 0.02), (0.1, 0.07, 0.05)))
BLACK_PLASTIC = principled("Black plastic", (0.02, 0.02, 0.022), roughness=0.35)
LAMP_SHADE = emissive("Lamp shade", (1.0, 0.78, 0.52), 6.0)
WINDOW_SKY = emissive("Window daylight", (1.0, 0.94, 0.86), 5.0)
BOOK_COLOURS = [(0.42, 0.07, 0.06), (0.08, 0.12, 0.26), (0.1, 0.22, 0.14), (0.62, 0.45, 0.16), (0.78, 0.74, 0.64),
                (0.3, 0.18, 0.1), (0.36, 0.37, 0.38), (0.55, 0.22, 0.12), (0.18, 0.28, 0.36), (0.12, 0.1, 0.09)]
BOOKS = [principled(f"Book {i}", c, roughness=0.62, coat=0.15) for i, c in enumerate(BOOK_COLOURS)]
rng = random.Random(3)

# ----------------------------------------------------------------------------------------------
# Room: 20 x 24 x 6 m, windows on the left wall, shelves on the others, freestanding stacks on the right.
# ----------------------------------------------------------------------------------------------
RX, RY0, RY1, RH = 10.0, 9.0, -7.0, 6.0
box("Library floor", (0, (RY0 + RY1) / 2, -0.03), (2 * RX, RY0 - RY1, 0.06), WOOD)
room = Builder("Library room")
room.box((0, RY1 - 0.15, RH / 2), (2 * RX, 0.3, RH), PLASTER)
room.box((RX + 0.15, (RY0 + RY1) / 2, RH / 2), (0.3, RY0 - RY1, RH), PLASTER)
room.box((0, RY0 + 0.15, RH / 2), (2 * RX, 0.3, RH), PLASTER)
room.box((0, (RY0 + RY1) / 2, RH + 0.15), (2 * RX, RY0 - RY1, 0.3), PLASTER)
y = RY1 + 0.5
while y < RY0:                                                       # ceiling slats
    room.box((0, y, RH - 0.12), (2 * RX, 0.08, 0.24), WALNUT)
    y += 0.5
WIN = [(-4.5, 2.6), (-0.5, 2.6), (3.5, 2.6), (7.0, 1.6)]               # (centre y, width) on the left wall
glass_b = Builder("Window glazing")
wall_x = -RX - 0.15
y = RY1
for cy, w in WIN + [(RY0 + 1.0, 0.0)]:
    y0 = cy - w / 2
    if y0 > y:
        room.box((wall_x, (y + y0) / 2, RH / 2), (0.3, y0 - y, RH), PLASTER)
    if w:
        room.box((wall_x, cy, 0.4), (0.3, w, 0.8), PLASTER)
        room.box((wall_x, cy, RH - 0.5), (0.3, w, 1.0), PLASTER)
        for k in range(1, 3):
            room.box((wall_x + 0.1, cy - w / 2 + k * w / 3, (0.8 + RH - 1.0) / 2), (0.06, 0.06, RH - 1.8), BLACK_PLASTIC)
        room.box((wall_x + 0.1, cy, 2.6), (0.06, w, 0.06), BLACK_PLASTIC)
        glass_b.box((wall_x - 0.4, cy, (0.8 + RH - 1.0) / 2), (0.05, w, RH - 1.8), WINDOW_SKY)
    y = cy + w / 2
instance(room.mesh(), "Library room")
instance(glass_b.mesh(), "Window glazing", shadow=False)


def shelf_unit(b, origin, length, height, axis, facing, levels):
    """Bookcase along `axis` ('x' or 'y') with books, opening toward `facing` (+1/-1 on the other axis)."""
    def P(u, v, z):
        return (origin[0] + u, origin[1] + v * facing, z) if axis == "x" else (origin[0] + v * facing, origin[1] + u, z)

    def S(su, sv, sz):
        return (su, sv, sz) if axis == "x" else (sv, su, sz)

    depth = 0.34
    b.box(P(length / 2, -depth / 2, height / 2), S(length, 0.02, height), WALNUT)                 # back
    for k in range(int(length / 0.9) + 1):                                                        # uprights
        b.box(P(min(length, k * 0.9), 0.0, height / 2), S(0.03, depth, height), WALNUT)
    lh = height / levels
    for lv in range(levels + 1):
        z = 0.06 + lv * lh
        b.box(P(length / 2, 0.0, z), S(length, depth, 0.03), WALNUT)
        if lv == levels:
            break
        u = 0.03
        while u < length - 0.06:
            if rng.random() < 0.06:
                u += rng.uniform(0.08, 0.3)
                continue
            w = rng.uniform(0.022, 0.05)
            h = min(lh - 0.05, rng.uniform(0.18, 0.31))
            d = rng.uniform(0.17, 0.25)
            if u + w > length - 0.03:
                break
            b.box(P(u + w / 2, depth / 2 - d / 2 - 0.02, z + 0.015 + h / 2), S(w, d, h), rng.choice(BOOKS))
            u += w + 0.003


books = Builder("Library shelves")
shelf_unit(books, (-RX + 0.3, RY1 + 0.2), 2 * RX - 0.6, 3.4, "x", 1, 8)                          # back wall
shelf_unit(books, (RX - 0.2, RY1 + 0.5), RY0 - RY1 - 1.0, 3.4, "y", -1, 8)                       # right wall
for k, x in enumerate((3.4, 5.6, 7.8)):                                                          # freestanding stacks
    for f in (1, -1):
        shelf_unit(books, (x + f * 0.18, -4.6), 6.0, 2.2, "y", f, 5)
instance(books.mesh(), "Library shelves", bevel=0.002)

# ----------------------------------------------------------------------------------------------
# The desk, the monitor showing Folio, and the reader.
# ----------------------------------------------------------------------------------------------
desk = Builder("Desk")
desk.box((0, 0, 0.75), (1.6, 0.8, 0.04), WALNUT)
for sx in (-1, 1):
    desk.box((sx * 0.74, 0, 0.37), (0.05, 0.7, 0.74), BLACK_PLASTIC)
desk.box((0, -0.25, 0.79), (0.2, 0.16, 0.02), BLACK_PLASTIC)                                      # monitor foot
desk.box((0, -0.27, 0.95), (0.04, 0.03, 0.32), BLACK_PLASTIC)                                     # monitor arm
desk.box((0, 0.12, 0.78), (0.44, 0.14, 0.015), BLACK_PLASTIC)                                     # keyboard
desk.box((0.36, 0.12, 0.78), (0.06, 0.1, 0.02), BLACK_PLASTIC)                                    # mouse
desk.cyl((-0.55, 0.05, 0.82), 0.04, 0.1, PLASTER, segments=20)                                    # cup
desk.box((-0.5, -0.15, 0.775), (0.22, 0.3, 0.012), principled("Notebook", (0.7, 0.66, 0.58), roughness=0.8))
desk.cyl((0.62, -0.2, 0.775), 0.07, 0.02, BLACK_PLASTIC, segments=20)                             # lamp base
desk.cyl((0.62, -0.2, 1.0), 0.012, 0.45, BLACK_PLASTIC, segments=10)
instance(desk.mesh(), "Desk", bevel=0.004)
bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.11, radius2=0.05, depth=0.12, location=(0.62, -0.2, 1.25))
shade = bpy.context.active_object
shade.data.materials.append(LAMP_SHADE)
point_light("Desk lamp", (0.62, -0.2, 1.18), 25, (1.0, 0.78, 0.52), 0.05)

# Monitor: the Folio screenshot from the portfolio (a local capture of the application), aspect taken from the image.
SCREEN_W = 0.62
SCREEN_C = Vector((0, -0.25, 1.1))
folio_img = None
_shot = os.path.join(ROOT, "public", "projects", "folio-overview.webp")
if os.path.exists(_shot):
    folio_img = bpy.data.images.load(_shot, check_existing=True)
SCREEN_ASPECT = 0.625                      # a 16:10 monitor; the tall page capture is cropped to its top
SCREEN_H = SCREEN_W * SCREEN_ASPECT
CROP = min(1.0, SCREEN_ASPECT * folio_img.size[0] / folio_img.size[1]) if folio_img and folio_img.size[1] else 1.0
box("Monitor body", (SCREEN_C.x, SCREEN_C.y - 0.018, SCREEN_C.z), (SCREEN_W + 0.03, 0.025, SCREEN_H + 0.03), BLACK_PLASTIC, bevel=0.006)
bpy.ops.mesh.primitive_plane_add(size=1.0, location=(SCREEN_C.x, SCREEN_C.y - 0.004, SCREEN_C.z), rotation=(math.pi / 2, 0, math.pi))
screen = bpy.context.active_object
screen.scale = (SCREEN_W, SCREEN_H, 1.0)
for loop_uv in screen.data.uv_layers.active.data:          # show the top CROP of the image (the app's first screen)
    loop_uv.uv[1] = 1.0 - (1.0 - loop_uv.uv[1]) * CROP
scr = principled("Folio screen", (0.0, 0.0, 0.0), roughness=0.45, coat=0.0, emission=(1, 1, 1), strength=0.9, specular=0.0)   # matte panel: no room reflection veiling the UI
if folio_img:
    tex = scr.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = folio_img
    scr.node_tree.links.new(tex.outputs["Color"], scr.node_tree.nodes["Principled BSDF"].inputs["Emission Color"])
screen.data.materials.append(scr)
screen.visible_shadow = False
screen_light = area_light("Screen glow", (SCREEN_C.x, SCREEN_C.y + 0.02, SCREEN_C.z), SCREEN_W, 6.0, (0.85, 0.9, 1.0),
                          rot=(-math.pi / 2, 0, 0), size_y=SCREEN_H, shadow=True)

chair = Builder("Chair")
chair.box((0, 0.98, 0.48), (0.5, 0.48, 0.08), FABRIC)
chair.box((0, 1.19, 0.8), (0.5, 0.07, 0.5), FABRIC, rot=Matrix.Rotation(math.radians(-8), 3, "X"))
chair.cyl((0, 1.0, 0.27), 0.03, 0.38, BLACK_PLASTIC, segments=12)
for k in range(5):
    a = 2 * math.pi * k / 5
    chair.box((math.sin(a) * 0.17, 1.0 + math.cos(a) * 0.17, 0.06), (0.05, 0.34, 0.04), BLACK_PLASTIC,
              rot=Matrix.Rotation(-a, 3, "Z"))
instance(chair.mesh(), "Chair", bevel=0.01)


def figure(name, mat, parts):
    """Smooth metaball figure (stylised on purpose: an anonymous reader seen from behind). Limbs are capsules so
    they read as continuous forms; a metaball surface sits at roughly 0.58 x the element radius here."""
    mb = bpy.data.metaballs.new(name)
    mb.resolution, mb.render_resolution, mb.threshold = 0.02, 0.01, 0.6
    for kind, co, r, size, rot in parts:
        e = mb.elements.new()
        e.co, e.radius = co, r
        if kind == "ELLIPSOID":
            e.type = "ELLIPSOID"
            e.size_x, e.size_y, e.size_z = size
        elif kind == "CAPSULE":
            e.type = "CAPSULE"
            e.size_x = size
            e.rotation = rot
    obj = link(bpy.data.objects.new(name, mb))
    obj.data.materials.append(mat)
    return obj


def capsule(a, b, r):
    a, b = Vector(a), Vector(b)
    d = b - a
    return ("CAPSULE", tuple((a + b) / 2), r, d.length / 2, Vector((1, 0, 0)).rotation_difference(d.normalized()))


def ellipsoid(co, r, size):
    return ("ELLIPSOID", co, r, size, None)


body = [ellipsoid((0, 0.95, 0.62), 0.34, (0.95, 0.75, 0.55)),            # hips on the seat
        ellipsoid((0, 0.93, 0.86), 0.36, (0.86, 0.6, 0.95)),             # back and chest
        ellipsoid((0, 0.91, 1.03), 0.34, (1.08, 0.58, 0.42)),            # shoulders
        ellipsoid((0, 0.975, 1.13), 0.2, (1.0, 0.55, 0.42))]             # hood of the jumper, bunched behind the neck
for s in (-1, 1):
    body += [capsule((s * 0.19, 0.91, 1.01), (s * 0.24, 0.76, 0.84), 0.1),     # upper arm
             capsule((s * 0.24, 0.76, 0.84), (s * 0.13, 0.44, 0.81), 0.085),   # forearm resting on the desk
             capsule((s * 0.1, 0.92, 0.57), (s * 0.12, 0.54, 0.57), 0.14),     # thigh
             capsule((s * 0.12, 0.54, 0.57), (s * 0.12, 0.5, 0.12), 0.1)]     # lower leg
figure("Reader body", KNIT, body)
skin = [capsule((0, 0.885, 1.09), (0, 0.87, 1.2), 0.08), ellipsoid((0, 0.855, 1.29), 0.19, (0.82, 0.92, 1.0))]
for s in (-1, 1):
    skin += [ellipsoid((s * 0.125, 0.37, 0.805), 0.09, (0.8, 1.15, 0.45)), ellipsoid((s * 0.098, 0.86, 1.285), 0.05, (0.5, 0.9, 1.1))]   # hands, ears
figure("Reader skin", SKIN, skin)
figure("Reader hair", HAIR, [ellipsoid((0, 0.872, 1.335), 0.2, (0.86, 0.95, 0.86)), ellipsoid((0, 0.905, 1.29), 0.15, (0.88, 0.7, 0.72)),
                             ellipsoid((0.0, 0.925, 1.375), 0.11, (1.05, 0.9, 0.75))])   # fuller crown at the back, no lobes

# Other reading tables with lamps (life in the room, out of focus).
for k, (x, y) in enumerate(((-4.6, 2.4), (-4.6, -2.6), (-1.2, 4.6))):
    t = Builder(f"Table {k}")
    t.box((0, 0, 0.75), (1.8, 0.9, 0.04), WALNUT)
    for sx in (-1, 1):
        t.box((sx * 0.82, 0, 0.37), (0.05, 0.8, 0.74), BLACK_PLASTIC)
    for sx in (-0.5, 0.5):
        t.cyl((sx, 0, 0.775), 0.06, 0.02, BLACK_PLASTIC, segments=16)
        t.cyl((sx, 0, 0.98), 0.01, 0.4, BLACK_PLASTIC, segments=8)
    instance(t.mesh(), f"Table {k}", (x, y, 0), bevel=0.004)
    for sx in (-0.5, 0.5):
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.1, radius2=0.04, depth=0.11, location=(x + sx, y, 1.2))
        bpy.context.active_object.data.materials.append(LAMP_SHADE)
        point_light(f"Table lamp {k} {sx}", (x + sx, y, 1.12), 18, (1.0, 0.78, 0.52), 0.05)
for k, (x, y) in enumerate(((-6.0, -4.0), (-2.0, -4.0), (2.0, 1.0), (-6.0, 2.0), (-2.0, 2.0))):      # pendant lights
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.22, depth=0.05, location=(x, y, 3.6))
    bpy.context.active_object.data.materials.append(LAMP_SHADE)
    box(f"Pendant cord {k}", (x, y, (3.6 + RH) / 2), (0.01, 0.01, RH - 3.6), BLACK_PLASTIC, shadow=False)
    point_light(f"Pendant {k}", (x, y, 3.5), 120, (1.0, 0.8, 0.58), 0.2)
# Daylight through the windows: a low warm sun and soft window fill.
sun("Window sun", (Vector((0.82, -0.25, -0.5)).normalized()).to_track_quat("-Z", "Y").to_euler(), 4.0, (1.0, 0.86, 0.68), angle=1.2)
for k, (cy, w) in enumerate(WIN):
    area_light(f"Window fill {k}", (-RX + 0.3, cy, 2.8), w, 260, (1.0, 0.95, 0.88), rot=(0, math.radians(90), 0), size_y=4.0, shadow=False)
air = bpy.data.materials.new("Library air")
air.use_nodes = True
_an = air.node_tree
_an.nodes.remove(_an.nodes["Principled BSDF"])
_av = _an.nodes.new("ShaderNodeVolumePrincipled")
_av.inputs["Density"].default_value = 0.012
_av.inputs["Anisotropy"].default_value = 0.6
_an.links.new(_av.outputs[0], _an.nodes["Material Output"].inputs["Volume"])
box("Library air", (0, (RY0 + RY1) / 2, RH / 2), (2 * RX - 0.4, RY0 - RY1 - 0.4, RH - 0.3), air, shadow=False)

# ----------------------------------------------------------------------------------------------
# Camera: screen-filling start (matches the browser UI on the page), then a slow pull back past the reader.
# ----------------------------------------------------------------------------------------------
def ss(a, b, x):
    k = min(1.0, max(0.0, (x - a) / (b - a)))
    return k * k * (3 - 2 * k)


def catmull(points, u):
    n = len(points) - 1
    x = min(max(u, 0.0), 1.0) * n
    i = min(int(x), n - 1)
    t = x - i
    p0, p1, p2 = Vector(points[max(i - 1, 0)]), Vector(points[i]), Vector(points[i + 1])
    p3 = Vector(points[min(i + 2, n)])
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)


def keyed(keys, f):
    frames = [k[0] for k in keys]
    for i in range(len(frames) - 1):
        if frames[i] <= f <= frames[i + 1]:
            local = (f - frames[i]) / max(1, frames[i + 1] - frames[i])
            return catmull([k[1] for k in keys], (i + local) / (len(keys) - 1))
    return Vector(keys[-1][1])


START_D = 0.52 if VARIANT == "desktop" else 0.95
CAM = [(0, (0.0, SCREEN_C.y + START_D, SCREEN_C.z)), (24, (0.24, 0.42, 1.2)), (44, (0.62, 1.5, 1.6)), (70, (0.48, 2.1, 1.62)),
       (100, (0.95, 3.3, 1.78)), (128, (1.6, 4.6, 1.9)), (149, (2.0, 5.3, 2.0))]
TGT = [(0, tuple(SCREEN_C)), (24, tuple(SCREEN_C)), (44, (0.0, -0.1, 1.05)), (70, (0.0, 0.3, 1.0)), (100, (-0.2, 0.0, 1.05)), (149, (-0.4, -0.5, 1.15))]
FOCUS = [(0, tuple(SCREEN_C)), (64, tuple(SCREEN_C)), (100, (0.0, 0.85, 1.25)), (149, (0.0, 0.85, 1.2))]   # the reader stays soft while close
target = link(bpy.data.objects.new("Camera target", None))
focus = link(bpy.data.objects.new("Focus", None))
cam_data = bpy.data.cameras.new("Camera")
if VARIANT == "mobile":
    cam_data.sensor_fit, cam_data.lens = "VERTICAL", 20
else:
    cam_data.sensor_fit, cam_data.lens = "HORIZONTAL", 30
cam_data.clip_start, cam_data.clip_end = 0.01, 200
cam_data.dof.use_dof = True
cam_data.dof.focus_object = focus
cam_data.dof.aperture_fstop = 2.0
camera = link(bpy.data.objects.new("Camera", cam_data))
scene.camera = camera
trk = camera.constraints.new("TRACK_TO")
trk.target, trk.track_axis, trk.up_axis = target, "TRACK_NEGATIVE_Z", "UP_Y"
for f in range(N_FRAMES):
    for sock in CLOCKS:
        sock.default_value = float(f)
        sock.keyframe_insert("default_value", frame=f)
    camera.location = keyed(CAM, f)
    target.location = keyed(TGT, f)
    focus.location = keyed(FOCUS, f)
    for o in (camera, target, focus):
        o.keyframe_insert("location", frame=f)

scene.use_nodes = True
tree = scene.node_tree
try:
    for n in list(tree.nodes):
        tree.nodes.remove(n)
    rl = tree.nodes.new("CompositorNodeRLayers")
    comp_out = tree.nodes.new("CompositorNodeComposite")
    glare = tree.nodes.new("CompositorNodeGlare")
    for kind in ("BLOOM", "FOG_GLOW"):
        try:
            glare.glare_type = kind
            break
        except TypeError:
            continue
    for attr, value in (("quality", "HIGH"), ("mix", -0.75), ("threshold", 2.2), ("size", 7)):
        try_set(glare, attr, value)
    tree.links.new(rl.outputs["Image"], glare.inputs[0])
    tree.links.new(glare.outputs[0], comp_out.inputs[0])
except Exception as exc:
    print("Compositor fallback:", exc)


def export_path():
    out_dir = os.path.join(ROOT, "public", "cinematic", "library", VARIANT)
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for f in range(N_FRAMES):
        scene.frame_set(f)
        co = world_to_camera_view(scene, camera, SCREEN_C)
        rows.append([round(co.x, 4), round(1 - co.y, 4), round(co.z, 3), 1 if 0 <= co.x <= 1 and 0 <= co.y <= 1 else 0, 0.0])
    meta = {"frames": N_FRAMES, "tStart": T_START, "tEnd": T_END, "width": scene.render.resolution_x,
            "height": scene.render.resolution_y, "packet": rows, "beats": {"screen": [0, 24], "pullback": [24, N_FRAMES - 1]},
            "generator": GENERATOR, "blender": bpy.app.version_string,
            "note": "Conceptual illustration: stylised anonymous figure, invented setting."}
    with open(os.path.join(out_dir, "packet.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, separators=(",", ":"))
    print("Library path written:", out_dir)


if MODE == "export":
    export_path()
else:
    out_dir = os.path.join(RENDER_ROOT, OUT_NAME)
    os.makedirs(out_dir, exist_ok=True)
    frames = [int(x) for x in FRAMES_ARG.split(",") if x] if FRAMES_ARG else range(N_FRAMES)
    for f in frames:
        if f >= N_FRAMES:
            continue
        scene.frame_set(f)
        scene.render.filepath = os.path.join(out_dir, f"{f:04d}.png")
        bpy.ops.render.render(write_still=True)
        with open(os.path.join(out_dir, "frames.jsonl"), "a", encoding="utf-8") as log_fh:   # version guard for the encoder
            log_fh.write(json.dumps({"frame": f, "generator": GENERATOR, "variant": VARIANT}) + "\n")
        print(f"Rendered frame {f}")
    if EXPORT:
        export_path()
