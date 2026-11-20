"""Engineering Observatory — Milestone 2 pipeline sequence (Git bay → CI hall → deployment corridor).

Fully procedural: run headless and the whole scene is rebuilt from this file.

    blender -b --factory-startup -P blender/scripts/pipeline_scene.py -- \
        --variant desktop --mode render [--frames 0,60,120] [--samples 32] [--scale 100]

    --variant  desktop (1280x720, 16:9) | mobile (540x960 portrait, separate framing)
    --mode     render  -> PNG frames in blender/renders/<variant>/
               export  -> public/cinematic/pipeline/<variant>/packet.json only (no rendering)
               save    -> blender/scenes/pipeline_<variant>.blend for inspection

The packet's projected screen position is written per frame so the website's live DOM packet
can hand off to the rendered one at exactly the right pixel. Story beats map to chapter progress
via FRAME_TO_T below (kept in sync with src/app/components/code-to-experience/pipeline.js).
"""

import json
import math
import os
import random
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

# --------------------------------------------------------------------------------------------
# Arguments and constants
# --------------------------------------------------------------------------------------------
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default):
    flag = f"--{name}"
    return argv[argv.index(flag) + 1] if flag in argv else default


VARIANT = arg("variant", "desktop")
MODE = arg("mode", "render")
SAMPLES = int(arg("samples", "32"))
SCALE = int(arg("scale", "100"))
FRAMES_ARG = arg("frames", "")
# Preview renders go to blender/renders/<out>/ so they never overwrite the full sequence.
OUT_NAME = arg("out", VARIANT)
if not OUT_NAME.replace("-", "").isalnum():
    raise SystemExit(f"bad --out {OUT_NAME!r}")
EXPORT = arg("no-export", "0") != "1"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

N_FRAMES = 288          # frames 0..287
T_START, T_END = 1.42, 3.95  # chapter progress covered by the sequence
FONT_MONO = "C:/Windows/Fonts/CascadiaMono.ttf"
FONT_SANS = "C:/Windows/Fonts/segoeuib.ttf"

random.seed(7)

NAVY = (0.006, 0.012, 0.024)
CYAN = (0.27, 0.9, 0.86)
AMBER = (1.0, 0.62, 0.25)
GREEN = (0.35, 0.95, 0.55)
VIOLET = (0.62, 0.55, 1.0)

# --------------------------------------------------------------------------------------------
# Scene reset and render settings
# --------------------------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start, scene.frame_end = 0, N_FRAMES - 1

for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        continue

ee = scene.eevee
ee.taa_render_samples = SAMPLES
for attr, value in (("use_raytracing", True), ("use_shadows", True), ("volumetric_tile_size", "16"),
                    ("volumetric_samples", 32), ("use_volumetric_shadows", True), ("shadow_pool_size", "256"), ("fast_gi_method", "GLOBAL_ILLUMINATION")):
    if hasattr(ee, attr):
        try:
            setattr(ee, attr, value)
        except (TypeError, AttributeError):
            pass
if hasattr(ee, "ray_tracing_options"):
    ee.ray_tracing_options.resolution_scale = "2"

if VARIANT == "mobile":
    scene.render.resolution_x, scene.render.resolution_y = 540, 960
else:
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
scene.render.resolution_percentage = SCALE
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.film_transparent = False
scene.render.use_motion_blur = False  # stills for scrubbing: no motion vectors needed
scene.view_settings.view_transform = "AgX"
try:
    scene.view_settings.look = "AgX - Medium High Contrast"
except TypeError:
    pass
scene.view_settings.exposure = 0.2

# World: deep navy with a thin volume for atmospheric depth (no fog wash-out).
world = bpy.data.worlds.new("World")
scene.world = world
world.use_nodes = True
wn = world.node_tree.nodes
wl = world.node_tree.links
wn["Background"].inputs["Color"].default_value = (*NAVY, 1)
wn["Background"].inputs["Strength"].default_value = 1.0
vol = wn.new("ShaderNodeVolumePrincipled")
vol.inputs["Density"].default_value = 0.0035
vol.inputs["Anisotropy"].default_value = 0.35
wl.new(vol.outputs[0], wn["World Output"].inputs["Volume"])

# --------------------------------------------------------------------------------------------
# Materials
# --------------------------------------------------------------------------------------------
def principled(name, color, metallic=0.0, roughness=0.4, emission=None, strength=0.0, coat=0.0, alpha=1.0, transmission=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = coat
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    if transmission:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    if alpha < 1:
        bsdf.inputs["Alpha"].default_value = alpha
        if hasattr(mat, "surface_render_method"):
            mat.surface_render_method = "BLENDED"
    return mat


def brushed_metal(name, color, roughness=0.32):
    """Anisotropic-looking brushed metal: stretched noise drives roughness."""
    mat = principled(name, color, metallic=1.0, roughness=roughness)
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, 60.0, 1.0)
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 18.0
    noise.inputs["Detail"].default_value = 6.0
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["To Min"].default_value = roughness - 0.1
    ramp.inputs["To Max"].default_value = roughness + 0.12
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Value"])
    nt.links.new(ramp.outputs["Result"], bsdf.inputs["Roughness"])
    return mat


def emissive(name, color, strength):
    return principled(name, (0.02, 0.02, 0.02), roughness=0.5, emission=color, strength=strength)


def floor_tiles(name):
    """Polished dark floor with grout lines from a brick texture."""
    mat = principled(name, (0.035, 0.045, 0.06), metallic=0.2, roughness=0.18, coat=0.4)
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    coord = nt.nodes.new("ShaderNodeTexCoord")
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.offset = 0.0
    brick.inputs["Scale"].default_value = 0.6
    brick.inputs["Mortar Size"].default_value = 0.006
    brick.inputs["Color1"].default_value = (0.04, 0.05, 0.065, 1)
    brick.inputs["Color2"].default_value = (0.03, 0.04, 0.055, 1)
    brick.inputs["Mortar"].default_value = (0.008, 0.01, 0.014, 1)
    nt.links.new(coord.outputs["Object"], brick.inputs["Vector"])
    nt.links.new(brick.outputs["Color"], bsdf.inputs["Base Color"])
    rough = nt.nodes.new("ShaderNodeMapRange")
    rough.inputs["To Min"].default_value = 0.14
    rough.inputs["To Max"].default_value = 0.6
    nt.links.new(brick.outputs["Fac"], rough.inputs["Value"])
    nt.links.new(rough.outputs["Result"], bsdf.inputs["Roughness"])
    return mat


def rack_leds(name):
    """Server faceplates: dark metal with sparse status LEDs, one small dot per 1U × 7 cm cell.

    Each cell's colour/state comes from white noise on its snapped coordinate (+ object location,
    so every cabinet differs); a distance mask turns the cell into a 6 mm dot. No textures needed."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    L = nt.links.new
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    plate = nt.nodes.new("ShaderNodeBsdfPrincipled")
    plate.inputs["Base Color"].default_value = (0.025, 0.03, 0.038, 1)
    plate.inputs["Metallic"].default_value = 0.7
    plate.inputs["Roughness"].default_value = 0.36
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 14.0
    add_shader = nt.nodes.new("ShaderNodeAddShader")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    info = nt.nodes.new("ShaderNodeObjectInfo")
    cell = (1.0, 0.07, 0.0445)
    snap = nt.nodes.new("ShaderNodeVectorMath"); snap.operation = "SNAP"; snap.inputs[1].default_value = cell
    local = nt.nodes.new("ShaderNodeVectorMath"); local.operation = "SUBTRACT"
    flat = nt.nodes.new("ShaderNodeVectorMath"); flat.operation = "MULTIPLY"; flat.inputs[1].default_value = (0, 1, 1)
    dist = nt.nodes.new("ShaderNodeVectorMath"); dist.operation = "DISTANCE"; dist.inputs[1].default_value = (0, 0.014, 0.022)
    dot = nt.nodes.new("ShaderNodeMath"); dot.operation = "LESS_THAN"; dot.inputs[1].default_value = 0.0032
    seed = nt.nodes.new("ShaderNodeVectorMath"); seed.operation = "ADD"
    noise = nt.nodes.new("ShaderNodeTexWhiteNoise"); noise.noise_dimensions = "3D"
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, (0, 0, 0, 1)
    els[1].position, els[1].color = 0.62, (0, 0, 0, 1)
    for pos, col in ((0.63, (*CYAN, 1)), (0.88, (*GREEN, 1)), (0.97, (*AMBER, 1))):
        e = els.new(pos)
        e.color = col
    ramp.color_ramp.interpolation = "CONSTANT"
    mul = nt.nodes.new("ShaderNodeMixRGB"); mul.blend_type = "MULTIPLY"; mul.inputs["Fac"].default_value = 1.0
    L(coord.outputs["Object"], snap.inputs[0])
    L(coord.outputs["Object"], local.inputs[0]); L(snap.outputs[0], local.inputs[1])
    L(local.outputs[0], flat.inputs[0]); L(flat.outputs[0], dist.inputs[0])
    L(dist.outputs["Value"], dot.inputs[0])
    L(snap.outputs[0], seed.inputs[0]); L(info.outputs["Location"], seed.inputs[1])
    L(seed.outputs[0], noise.inputs["Vector"]); L(noise.outputs["Value"], ramp.inputs["Fac"])
    L(ramp.outputs["Color"], mul.inputs["Color1"]); L(dot.outputs[0], mul.inputs["Color2"])
    L(mul.outputs[0], emit.inputs["Color"])
    # Drive-bay grid on the bezel: brick texture rows of 40 mm bays with dark gaps.
    bays = nt.nodes.new("ShaderNodeTexBrick")
    bays.offset = 0.0
    bays.inputs["Scale"].default_value = 1.0
    bays.inputs["Brick Width"].default_value = 0.042
    bays.inputs["Row Height"].default_value = 0.0222
    bays.inputs["Mortar Size"].default_value = 0.0016
    bays.inputs["Color1"].default_value = (0.05, 0.058, 0.07, 1)
    bays.inputs["Color2"].default_value = (0.035, 0.042, 0.052, 1)
    bays.inputs["Mortar"].default_value = (0.004, 0.005, 0.007, 1)
    L(coord.outputs["Object"], bays.inputs["Vector"])
    L(bays.outputs["Color"], plate.inputs["Base Color"])
    L(plate.outputs[0], add_shader.inputs[0]); L(emit.outputs[0], add_shader.inputs[1])
    L(add_shader.outputs[0], out.inputs["Surface"])
    return mat


def perforated_floor(name):
    """Raised-floor cold-aisle tiles: 600 mm tiles with a field of airflow perforations."""
    mat = principled(name, (0.06, 0.07, 0.085), metallic=0.6, roughness=0.3)
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    coord = nt.nodes.new("ShaderNodeTexCoord")
    tiles = nt.nodes.new("ShaderNodeTexBrick")
    tiles.offset = 0.0
    tiles.inputs["Scale"].default_value = 1.0
    tiles.inputs["Brick Width"].default_value = 0.6
    tiles.inputs["Row Height"].default_value = 0.6
    tiles.inputs["Mortar Size"].default_value = 0.006
    holes = nt.nodes.new("ShaderNodeTexBrick")
    holes.offset = 0.5
    holes.inputs["Scale"].default_value = 1.0
    holes.inputs["Brick Width"].default_value = 0.025
    holes.inputs["Row Height"].default_value = 0.025
    holes.inputs["Mortar Size"].default_value = 0.008
    mix = nt.nodes.new("ShaderNodeMath"); mix.operation = "MULTIPLY"
    ramp = nt.nodes.new("ShaderNodeMapRange")
    ramp.inputs["To Min"].default_value = 0.012
    ramp.inputs["To Max"].default_value = 0.075
    nt.links.new(coord.outputs["Object"], tiles.inputs["Vector"])
    nt.links.new(coord.outputs["Object"], holes.inputs["Vector"])
    nt.links.new(tiles.outputs["Fac"], mix.inputs[0])
    nt.links.new(holes.outputs["Fac"], mix.inputs[1])
    # Fac is 1 in mortar: perforations and seams are dark, the plate between them is bright metal.
    inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
    nt.links.new(holes.outputs["Fac"], inv.inputs[1])
    nt.links.new(inv.outputs[0], ramp.inputs["Value"])
    to_rgb = nt.nodes.new("ShaderNodeCombineColor")
    for i in range(3):
        nt.links.new(ramp.outputs["Result"], to_rgb.inputs[i])
    nt.links.new(to_rgb.outputs[0], bsdf.inputs["Base Color"])
    return mat


M = {
    "steel": brushed_metal("Brushed steel", (0.55, 0.58, 0.62), 0.3),
    "dark_metal": brushed_metal("Dark rack metal", (0.05, 0.06, 0.075), 0.38),
    "gunmetal": brushed_metal("Gunmetal", (0.16, 0.18, 0.21), 0.34),
    "floor": floor_tiles("Floor tiles"),
    "glass": principled("Optical glass", (0.55, 0.75, 0.85), roughness=0.04, transmission=1.0, alpha=0.18),
    # Emission strengths tuned so light strips read as light sources without clipping to white.
    "cyan": emissive("Cyan light", CYAN, 6.0),
    "cyan_soft": emissive("Cyan soft", CYAN, 2.2),
    "amber": emissive("Amber light", AMBER, 8.0),
    "amber_soft": emissive("Amber soft", AMBER, 3.0),
    "green": emissive("Green light", GREEN, 5.0),
    "violet": emissive("Violet light", VIOLET, 4.0),
    "white_panel": emissive("Ceiling panel", (0.85, 0.92, 1.0), 4.0),
    "packet": emissive("Packet core", AMBER, 22.0),
    "panel": brushed_metal("Wall panel", (0.09, 0.11, 0.14), 0.42),
    "leds": rack_leds("Rack LEDs"),
    "label": emissive("Label", (0.82, 0.93, 0.96), 2.2),
    "label_amber": emissive("Label amber", AMBER, 3.0),
    "rubber": principled("Belt rubber", (0.02, 0.022, 0.026), roughness=0.75),
}
M.update({
    "robot": principled("Robot paint", (0.95, 0.42, 0.06), metallic=0.25, roughness=0.32, coat=0.6),
    "perforated": perforated_floor("Perforated floor"),
    "fibre_white": principled("Fibre white", (0.82, 0.85, 0.88), roughness=0.35),
    "fibre_blue": principled("Fibre blue", (0.12, 0.38, 0.85), roughness=0.35),
    "fibre_yellow": principled("Fibre yellow", (0.95, 0.72, 0.08), roughness=0.35),
    "raceway": principled("Fibre raceway", (0.95, 0.62, 0.05), metallic=0.1, roughness=0.4),
    "display": principled("Display glass", (0.01, 0.015, 0.025), metallic=0.0, roughness=0.08, coat=1.0),
    # The code wall dissolves as the camera passes through it (alpha/emission keyed per frame below).
    "wall_glass": principled("Code wall glass", (0.02, 0.05, 0.08), roughness=0.06, alpha=0.85),
    "wall_text": emissive("Code wall text", (0.72, 0.9, 0.95), 2.6),
    "wall_token": emissive("Code wall token", AMBER, 4.0),
})
M["packet"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 5.0  # reads amber, not white

# --------------------------------------------------------------------------------------------
# Geometry helpers
# --------------------------------------------------------------------------------------------
COLL = scene.collection


def box(name, loc, size, mat, bevel=0.02, segments=2):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    COLL.objects.link(obj)
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    bm.to_mesh(mesh)
    bm.free()
    obj.location = loc
    obj.data.materials.append(mat)
    if bevel > 0:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "ANGLE"
        mod.harden_normals = True
    return obj


def cylinder(name, loc, radius, depth, mat, rot=(0, 0, 0), verts=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def torus(name, loc, major, minor, mat, rot=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc, rotation=rot,
                                     major_segments=96, minor_segments=12)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


# Default faces +Y (towards a camera looking down -Y); local +X then reads left-to-right on screen.
FACE_CAMERA = (math.pi / 2, 0, math.pi)


def text(body, loc, size, mat, font=FONT_MONO, rot=FACE_CAMERA, align="LEFT", extrude=0.004):
    curve = bpy.data.curves.new(name=f"txt_{body[:12]}", type="FONT")
    curve.body = body
    curve.size = size
    curve.extrude = extrude
    curve.align_x = align
    try:
        curve.font = bpy.data.fonts.load(font, check_existing=True)
    except RuntimeError:
        pass
    obj = bpy.data.objects.new(curve.name, curve)
    COLL.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot
    obj.data.materials.append(mat)
    return obj


def tube(name, points, radius, mat, resolution=8):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for bp, p in zip(spline.bezier_points, points):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = "AUTO"
    curve.resolution_u = resolution
    obj = bpy.data.objects.new(name, curve)
    COLL.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def area_light(name, loc, size, power, color=(1, 1, 1), rot=(0, 0, 0), shape="RECTANGLE", size_y=None):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = shape
    data.size = size
    if size_y:
        data.size_y = size_y
    obj = bpy.data.objects.new(name, data)
    obj.location = loc
    obj.rotation_euler = rot
    COLL.objects.link(obj)
    return obj


def point_light(name, loc, power, color, radius=0.1):
    data = bpy.data.lights.new(name, "POINT")
    data.energy = power
    data.color = color
    data.shadow_soft_size = radius
    obj = bpy.data.objects.new(name, data)
    obj.location = loc
    COLL.objects.link(obj)
    return obj


import bmesh
from mathutils import Matrix


class Builder:
    """Accumulates many boxes/cylinders into ONE mesh with material slots. A detailed rack becomes a
    single datablock that every rack instance shares (one object each, no duplicated geometry)."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []

    def _slot(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _finish_part(self, verts, mat):
        idx = self._slot(mat)
        for face in {f for v in verts for f in v.link_faces}:
            face.material_index = idx

    def box(self, center, size, mat):
        verts = bmesh.ops.create_cube(self.bm, size=1.0)["verts"]
        bmesh.ops.scale(self.bm, vec=size, verts=verts)
        bmesh.ops.translate(self.bm, vec=center, verts=verts)
        self._finish_part(verts, mat)

    def cyl(self, center, radius, depth, mat, axis="Z", segments=16):
        verts = bmesh.ops.create_cone(self.bm, cap_ends=True, segments=segments, radius1=radius, radius2=radius, depth=depth)["verts"]
        if axis == "X":
            bmesh.ops.rotate(self.bm, verts=verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "Y"))
        elif axis == "Y":
            bmesh.ops.rotate(self.bm, verts=verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
        bmesh.ops.translate(self.bm, vec=center, verts=verts)
        self._finish_part(verts, mat)

    def mesh(self):
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for mat in self.mats:
            mesh.materials.append(mat)
        return mesh


def instance(mesh, name, loc, rot=(0, 0, 0), bevel=0.0):
    obj = bpy.data.objects.new(name, mesh)
    COLL.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot
    if bevel:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
        mod.harden_normals = True
    return obj


def cable_set(name, splines, mats, radius):
    """Many cables as splines of ONE curve object; each spline picks a material slot."""
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 1
    curve.resolution_u = 6
    for points, mat_index in splines:
        sp = curve.splines.new("BEZIER")
        sp.bezier_points.add(len(points) - 1)
        for bp, p in zip(sp.bezier_points, points):
            bp.co = p
            bp.handle_left_type = bp.handle_right_type = "AUTO"
        sp.material_index = mat_index
    obj = bpy.data.objects.new(name, curve)
    COLL.objects.link(obj)
    for mat in mats:
        obj.data.materials.append(mat)
    return obj


# --------------------------------------------------------------------------------------------
# Shared architecture: one continuous floor, walls and ceiling spine from the screen to the racks
# --------------------------------------------------------------------------------------------
box("Floor", (0, -90, -0.05), (12, 190, 0.1), M["floor"], bevel=0)
box("Ceiling", (0, -90, 6.2), (12, 190, 0.1), M["dark_metal"], bevel=0)
for side in (-1, 1):
    box(f"Wall {side}", (side * 6.0, -90, 3.0), (0.2, 190, 6.2), M["dark_metal"], bevel=0)
    # Continuous guide light strips at floor level tie the three environments together.
    box(f"Guide strip {side}", (side * 2.9, -90, 0.012), (0.035, 186, 0.01), M["cyan_soft"], bevel=0)
    # Architectural wall modules: bevelled panels with recessed light seams (gives the walls scale and
    # reflections instead of a flat black slab). The deployment corridor is lined by racks instead.
    for k, y in enumerate(range(-1, -114, -3)):
        box(f"Wall panel {side} {k}", (side * 5.82, y - 1.5, 2.35), (0.12, 2.86, 3.9), M["panel"], bevel=0.04, segments=3)
        if k % 2 == 0:
            box(f"Wall seam {side} {k}", (side * 5.78, y, 2.35), (0.02, 0.03, 3.7), M["cyan_soft"], bevel=0)
        box(f"Wall plinth {side} {k}", (side * 5.8, y - 1.5, 0.15), (0.2, 2.9, 0.3), M["gunmetal"], bevel=0.02)
    area_light(f"Wall wash {side}", (side * 3.8, -55, 5.3), 4.0, 900, (0.6, 0.78, 1.0),
               rot=(0, -side * math.radians(55), 0), size_y=110)  # area lights emit along local -Z

# Overhead truss beams every 6 m (industrial rhythm, also gives parallax).
for i, y in enumerate(range(-4, -180, -6)):
    box(f"Truss {i}", (0, y, 5.7), (11.6, 0.22, 0.3), M["gunmetal"], bevel=0.03)
    if -112 < y < -52 or y > -50:
        box(f"Truss light {i}", (0, y + 0.13, 5.52), (6.0, 0.04, 0.03), M["white_panel"], bevel=0)

# --------------------------------------------------------------------------------------------
# A. Source-control bay (y 0 → -52): main lane, feature branch, commits, release tag
# --------------------------------------------------------------------------------------------
LANE_Z = 0.9


def lane_points(x_fn, y0, y1, steps=40):
    return [(x_fn(y0 + (y1 - y0) * i / steps), y0 + (y1 - y0) * i / steps, LANE_Z) for i in range(steps + 1)]


# Raised glass bridge carrying the lanes.
box("Git bridge", (0, -25, LANE_Z - 0.12), (6.4, 54, 0.06), M["glass"], bevel=0.01)
box("Git bridge rail L", (-3.2, -25, LANE_Z - 0.06), (0.05, 54, 0.12), M["steel"], bevel=0.01)
box("Git bridge rail R", (3.2, -25, LANE_Z - 0.06), (0.05, 54, 0.12), M["steel"], bevel=0.01)
for y in range(-2, -52, -6):
    box(f"Bridge pier {y}", (-2.6, y, LANE_Z / 2 - 0.1), (0.18, 0.18, LANE_Z - 0.2), M["steel"])
    box(f"Bridge pier R{y}", (2.6, y, LANE_Z / 2 - 0.1), (0.18, 0.18, LANE_Z - 0.2), M["steel"])


def feature_x(y):
    # Branch leaves main at y=-6, runs parallel at x=-2.0, merges back by y=-34.
    if y > -6:
        return 0.0
    if y > -12:
        k = (-6 - y) / 6
        return -2.0 * (k * k * (3 - 2 * k))
    if y > -28:
        return -2.0
    if y > -34:
        k = (y + 28) / -6
        return -2.0 * (1 - k * k * (3 - 2 * k))
    return 0.0


tube("Lane main", lane_points(lambda y: 0.0, 2, -52), 0.035, M["violet"])
tube("Lane feature", lane_points(feature_x, -5.5, -34.5, 60), 0.035, M["cyan"])
tube("Lane release", lane_points(lambda y: 1.9 if y < -40 else 1.9 * max(0, (-34 - y) / 6), -34, -52), 0.03, M["green"])

text("main", (-0.2, -9.0, LANE_Z + 0.05), 0.2, M["label"])
text("feature/library-search", (-2.0, -13.5, LANE_Z + 0.12), 0.3, M["label"], align="CENTER")
text("release/v1.0", (1.9, -44.5, LANE_Z + 0.12), 0.3, M["label"], align="CENTER")

COMMITS = [(-2.0, -16.0, "a3f9c21", "add catalogue search"), (-2.0, -23.0, "7be104d", "test SearchAsync"), (0.0, -37.0, "merge", "into main")]
for x, y, sha, msg in COMMITS:
    cylinder(f"Commit {sha}", (x, y, LANE_Z), 0.32, 0.12, M["gunmetal"], rot=(0, 0, 0), verts=6)
    torus(f"Commit ring {sha}", (x, y, LANE_Z + 0.07), 0.36, 0.022, M["amber" if sha == "merge" else "cyan"], rot=(0, 0, 0))
    text(f"{sha}  {msg}", (x - 0.5, y, LANE_Z + 0.32), 0.17, M["label"])

# Release tag gate: a machined frame the packet passes through.
gate_y = -46.0
for side in (-1, 1):
    box(f"Tag gate post {side}", (side * 3.0, gate_y, 2.3), (0.3, 0.4, 4.6), M["steel"], bevel=0.04)
box("Tag gate beam", (0, gate_y, 4.55), (6.3, 0.4, 0.3), M["steel"], bevel=0.04)
box("Tag gate glow", (0, gate_y + 0.21, 4.45), (5.4, 0.02, 0.05), M["green"], bevel=0)
text("TAG  release/v1.0", (0, gate_y + 0.22, 4.7), 0.26, M["label"], align="CENTER")
area_light("Git key", (0, -20, 5.4), 8, 600, (0.7, 0.85, 1.0), size_y=40)

# --------------------------------------------------------------------------------------------
# B. CI hall (y -55 → -112): conveyor + four machined stations
# --------------------------------------------------------------------------------------------
BELT_Z = 0.8
box("Conveyor bed", (0, -83, BELT_Z - 0.12), (1.6, 60, 0.18), M["gunmetal"], bevel=0.03)
box("Conveyor belt", (0, -83, BELT_Z - 0.02), (1.2, 60, 0.03), M["rubber"], bevel=0.005)
for y in [v * 0.6 for v in range(-89, -188, -1)]:
    cylinder(f"Roller {y:.1f}", (0, y, BELT_Z - 0.1), 0.06, 1.25, M["steel"], rot=(0, math.pi / 2, 0), verts=12)
for side in (-1, 1):
    box(f"Belt edge light {side}", (side * 0.78, -83, BELT_Z - 0.01), (0.02, 60, 0.02), M["cyan_soft"], bevel=0)
    # Process pipes along the walls.
    for k, z in enumerate((1.2, 1.55, 3.9)):
        cylinder(f"Pipe {side} {k}", (side * 5.5, -83, z), 0.12 if k < 2 else 0.22, 60, M["steel"], rot=(math.pi / 2, 0, 0), verts=20)

STATIONS = [(-62.0, "RESTORE", "dotnet restore", CYAN), (-75.0, "BUILD", "dotnet build -c Release", AMBER),
            (-88.0, "TEST", "dotnet test", GREEN), (-101.0, "PACKAGE", "dotnet publish", VIOLET)]
for y, name, cmd, col in STATIONS:
    mat_col = M["cyan"] if col == CYAN else M["amber"] if col == AMBER else M["green"] if col == GREEN else M["violet"]
    # Portal frame.
    for side in (-1, 1):
        box(f"{name} post {side}", (side * 2.1, y, 1.6), (0.5, 1.1, 3.2), M["dark_metal"], bevel=0.05, segments=3)
        box(f"{name} post trim {side}", (side * 1.83, y + 0.56, 1.6), (0.04, 0.02, 2.9), mat_col, bevel=0)
    box(f"{name} lintel", (0, y, 3.35), (4.7, 1.1, 0.5), M["dark_metal"], bevel=0.05, segments=3)
    box(f"{name} lintel strip", (0, y + 0.56, 3.12), (3.6, 0.02, 0.05), mat_col, bevel=0)
    text(name, (0, y + 0.57, 3.32), 0.3, M["label"], font=FONT_SANS, align="CENTER")
    text(cmd, (0, y + 0.57, 2.92), 0.14, M["label_amber"] if col == AMBER else M["label"], align="CENTER")
    area_light(f"{name} wash", (0, y + 0.2, 3.05), 3.2, 55 if col == GREEN else 120, col, size_y=0.6)

# Restore: package crates on racks either side.
for side in (-1, 1):
    for i in range(10):
        box(f"Crate {side} {i}", (side * 3.6, -59.5 - (i % 5) * 1.1, 0.35 + (i // 5) * 0.75), (0.9, 0.9, 0.62), M["gunmetal"], bevel=0.03)
        box(f"Crate label {side} {i}", (side * 3.14, -59.5 - (i % 5) * 1.1, 0.35 + (i // 5) * 0.75), (0.01, 0.5, 0.12), M["cyan_soft"], bevel=0)
# Build: compiler block with heat vents.
for side in (-1, 1):
    box(f"Compiler {side}", (side * 3.7, -75, 1.3), (1.6, 3.4, 2.6), M["dark_metal"], bevel=0.06, segments=3)
    for k in range(7):
        box(f"Vent {side} {k}", (side * 2.88, -76.4 + k * 0.45, 1.6), (0.02, 0.22, 1.6), M["amber_soft"], bevel=0)
# Test: wall grids of status lamps (all passing in this illustration).
for side in (-1, 1):
    box(f"Test board {side}", (side * 3.9, -88, 2.0), (0.2, 4.0, 2.4), M["dark_metal"], bevel=0.03)
    for r in range(6):
        for c in range(12):
            box(f"Lamp {side} {r} {c}", (side * 3.78, -89.8 + c * 0.32, 1.1 + r * 0.32), (0.02, 0.07, 0.07), M["green"], bevel=0)
# Package: a press that wraps the artifact.
box("Press head", (0, -101, 2.45), (1.5, 1.4, 0.9), M["steel"], bevel=0.06, segments=3)
for side in (-1, 1):
    cylinder(f"Press piston {side}", (side * 0.55, -101, 2.95), 0.09, 0.9, M["steel"])

# --------------------------------------------------------------------------------------------
# B+. CI hall machinery: conveyor guards/legs, flanged pipes, robot arm at TEST, station log displays
# --------------------------------------------------------------------------------------------
ci = Builder("CI machinery")
for s in (-1, 1):
    ci.box((s * 0.86, -83, BELT_Z + 0.06), (0.04, 60, 0.12), M["steel"])                      # belt guards
    for ly in range(-54, -113, -2):
        ci.box((s * 0.68, ly, (BELT_Z - 0.2) / 2), (0.08, 0.08, BELT_Z - 0.2), M["steel"])     # support legs
        ci.box((s * 0.68, ly, 0.02), (0.18, 0.18, 0.04), M["gunmetal"])                         # foot plates
    for k, pz in enumerate((1.2, 1.55, 3.9)):
        r = 0.12 if k < 2 else 0.22
        for fy in range(-55, -112, -4):
            ci.cyl((s * 5.5, fy, pz), r * 1.35, 0.06, M["steel"], axis="Y", segments=20)        # flanges
        for by in range(-56, -112, -6):
            ci.box((s * 5.72, by, pz), (0.32, 0.06, 0.06), M["gunmetal"])                       # wall brackets
instance(ci.mesh(), "CI machinery", (0, 0, 0), bevel=0.004)


def robot_arm(name, base, yaw):
    """Six-axis industrial arm in amber paint (amber = computation). Static pose reaching over the belt."""
    arm = Builder(name)
    arm.cyl((0, 0, 0.12), 0.32, 0.24, M["gunmetal"], segments=32)            # base
    arm.cyl((0, 0, 0.36), 0.26, 0.24, M["robot"], segments=32)               # turntable
    arm.box((0, 0, 0.62), (0.3, 0.34, 0.36), M["robot"])                      # shoulder housing
    arm.cyl((0, 0, 0.78), 0.17, 0.46, M["gunmetal"], axis="X", segments=24)   # shoulder joint
    arm.box((0.22, 0, 1.18), (0.18, 0.22, 0.86), M["robot"])                  # lower arm (rotated below)
    arm.cyl((0.42, 0, 1.6), 0.13, 0.36, M["gunmetal"], axis="X", segments=24) # elbow
    arm.box((0.82, 0, 1.6), (0.82, 0.18, 0.18), M["robot"])                   # upper arm
    arm.cyl((1.25, 0, 1.6), 0.09, 0.26, M["gunmetal"], axis="X", segments=20) # wrist
    arm.box((1.35, 0, 1.46), (0.1, 0.12, 0.2), M["steel"])                    # tool flange
    for s in (-1, 1):
        arm.box((1.35, s * 0.05, 1.31), (0.04, 0.02, 0.12), M["steel"])       # gripper fingers
    for s in (-1, 1):
        arm.box((0.82, s * 0.095, 1.6), (0.6, 0.01, 0.04), M["amber_soft"])   # status strip
    obj = instance(arm.mesh(), name, base, rot=(0, 0, yaw), bevel=0.01)
    return obj


robot_arm("Test robot", (-2.15, -90.3, 0), 0.0)
robot_arm("Build robot", (2.15, -77.3, 0), math.pi)

# Station log displays: what each stage is doing (illustrative output, no fabricated metrics).
LOGS = {
    "RESTORE": ["$ dotnet restore", "Restoring packages for Folio.Api", "Restore complete"],
    "BUILD": ["$ dotnet build -c Release", "Compiling Folio.Api", "Build succeeded"],
    "TEST": ["$ dotnet test", "Running BooksControllerTests", "All tests passed"],
    "PACKAGE": ["$ dotnet publish -c Release", "Packaging release artifact", "Artifact ready: v1.0"],
}
for sy, name, _cmd, col in STATIONS:
    box(f"{name} display", (-1.62, sy + 0.62, 1.75), (0.9, 0.04, 0.62), M["display"], bevel=0.01)
    box(f"{name} display bezel", (-1.62, sy + 0.6, 1.75), (0.96, 0.03, 0.68), M["gunmetal"], bevel=0.01)
    for li, line in enumerate(LOGS[name]):
        text(line, (-1.22, sy + 0.645, 1.95 - li * 0.17), 0.07, M["label_amber"] if li == 2 and col == AMBER else M["label"])

# A+. Git bay architecture: structural ribs every 6 m and a hanging commit-graph display.
for k, ry in enumerate(range(-2, -52, -6)):
    rib = Builder(f"Rib {k}")
    rib.box((0, ry, 5.75), (11.4, 0.5, 0.35), M["gunmetal"])
    for s in (-1, 1):
        rib.box((s * 5.55, ry, 2.9), (0.4, 0.5, 5.8), M["gunmetal"])
        rib.box((s * 5.32, ry + 0.26, 2.9), (0.03, 0.02, 5.2), M["cyan_soft"])
    instance(rib.mesh(), f"Rib {k}", (0, 0, 0), bevel=0.02)
box("Graph display", (2.4, -20.0, 3.4), (2.6, 0.05, 1.3), M["display"], bevel=0.02)
for li, line in enumerate(["* 7be104d test SearchAsync", "* a3f9c21 add catalogue search", "|/", "* 5c0e912 main"]):
    text(line, (3.55, -19.97, 3.85 - li * 0.24), 0.12, M["label"])

# --------------------------------------------------------------------------------------------
# 0. The screen boundary (y +12 → 0): the editor's code on a glass wall, then a ribbed passage
#    that carries the artifact from the editor into the Git bay.
# --------------------------------------------------------------------------------------------
WALL_Y = 9.5
CODE_SIZE = 0.15
ADVANCE = 0.586 * CODE_SIZE   # Cascadia Mono advance width
LINE_H = 0.25
CODE_LINES = [
    "[ApiController]", "[Route(\"api/books\")]", "public class BooksController(IBookService service)",
    "    : ControllerBase", "{", "    [HttpGet]", "    public async Task<IActionResult> Search(",
    "        [FromQuery] string query)", "    {", "        var books = await @@;", "        return Ok(books);", "    }", "}",
]
TOKEN = "service.SearchAsync(query)"
X0, Z0 = 2.2, 3.15
token_pos = None
for i, line in enumerate(CODE_LINES):
    z = Z0 - i * LINE_H
    if "@@" in line:
        prefix, suffix = line.split("@@")
        text(prefix, (X0, WALL_Y, z), CODE_SIZE, M["wall_text"])
        tx = X0 - len(prefix) * ADVANCE
        text(TOKEN, (tx, WALL_Y, z), CODE_SIZE, M["wall_token"])
        text(suffix, (tx - len(TOKEN) * ADVANCE, WALL_Y, z), CODE_SIZE, M["wall_text"])
        token_pos = Vector((tx - len(TOKEN) * ADVANCE / 2, WALL_Y - 0.06, z + CODE_SIZE * 0.35))
    else:
        text(line, (X0, WALL_Y, z), CODE_SIZE, M["wall_text"])
    text(f"{i + 1:02d}", (X0 + 0.42, WALL_Y, z), CODE_SIZE, M["label"])
box("Code wall", (0, WALL_Y + 0.03, 1.8), (6.2, 0.02, 3.6), M["wall_glass"], bevel=0)

passage = Builder("Passage")
for k in range(10):
    py = 8.6 - k * 0.92
    passage.box((0, py, 3.35), (4.6, 0.22, 0.26), M["gunmetal"])
    for s in (-1, 1):
        passage.box((s * 2.2, py, 1.6), (0.26, 0.22, 3.3), M["gunmetal"])
        passage.box((s * 2.05, py + 0.12, 1.6), (0.02, 0.02, 3.0), M["cyan_soft"])
    passage.box((0, py + 0.12, 3.2), (4.0, 0.02, 0.02), M["cyan_soft"])
passage.box((0, 4.4, 0.0), (4.4, 9.0, 0.02), M["perforated"])
instance(passage.mesh(), "Passage", (0, 0, 0), bevel=0.01)
box("Passage floor", (0, 6, -0.05), (12, 12, 0.1), M["floor"], bevel=0)
area_light("Passage key", (0, 4.5, 3.1), 3.0, 220, (0.6, 0.85, 1.0), size_y=8.0)

# --------------------------------------------------------------------------------------------
# C. Deployment corridor (y -114 → -176): a cold aisle between rows of modelled 42U racks
# --------------------------------------------------------------------------------------------
AISLE_X = 1.8          # rack fronts at ±1.8 m: a 3.6 m cold aisle the camera can travel without clipping
RACK_W, RACK_D, RACK_H = 0.6, 1.1, 2.2
ROW_Y0, ROW_Y1 = -116.0, -169.4
U = 0.0445             # one rack unit


def build_rack(variant):
    """One 42U cabinet: shell, posts, plinth, servers of 1U/2U/4U with bezels, handles and blanks,
    patch panel at the top. Front face at local x = 0, depth along +x, width along y."""
    rnd = random.Random(100 + variant)
    b = Builder(f"Rack mesh {variant}")
    b.box((RACK_D / 2, 0, RACK_H - 0.006), (RACK_D, RACK_W, 0.012), M["dark_metal"])          # roof
    b.box((RACK_D / 2, 0, 0.05), (RACK_D - 0.02, RACK_W - 0.02, 0.1), M["gunmetal"])         # plinth
    b.box((RACK_D - 0.005, 0, RACK_H / 2), (0.01, RACK_W, RACK_H), M["dark_metal"])          # back
    for s in (-1, 1):
        b.box((RACK_D / 2, s * (RACK_W / 2 - 0.006), RACK_H / 2), (RACK_D, 0.012, RACK_H), M["dark_metal"])  # sides
        b.box((0.03, s * 0.268, RACK_H / 2), (0.03, 0.036, RACK_H - 0.02), M["steel"])       # front posts
        b.box((0.02, s * 0.268, RACK_H - 0.08), (0.05, 0.05, 0.05), M["steel"])             # post caps
    z = 0.12
    while z < RACK_H - 0.16:
        kind = rnd.choices(["1U", "2U", "4U", "blank"], weights=[5, 4, 1, 1])[0]
        units = {"1U": 1, "2U": 2, "4U": 4, "blank": 1}[kind]
        h = units * U
        if z + h > RACK_H - 0.16:
            break
        cz = z + h / 2
        if kind == "blank":
            b.box((0.012, 0, cz), (0.004, 0.48, h - 0.002), M["gunmetal"])
        else:
            b.box((0.45, 0, cz), (0.86, 0.48, h - 0.004), M["gunmetal"])                    # chassis body
            b.box((0.014, 0, cz), (0.008, 0.46, h - 0.006), M["leds"])                      # bezel: bays + LEDs
            for s in (-1, 1):
                b.box((0.006, s * 0.243, cz), (0.02, 0.012, h * 0.62), M["steel"])          # rack ears / handles
            if units >= 2:
                b.box((0.004, -0.17, cz), (0.004, 0.08, h * 0.5), M["gunmetal"])            # vent grille
        z += h
    b.box((0.016, 0, RACK_H - 0.12), (0.012, 0.48, 2 * U - 0.004), M["leds"])               # patch panel
    return b.mesh()


RACK_MESHES = [build_rack(v) for v in range(4)]
rng = random.Random(42)
rack_positions = []
y = ROW_Y0
while y > ROW_Y1:
    rack_positions.append(y)
    y -= RACK_W
bay_y = -171.0
for side in (-1, 1):
    for i, ry in enumerate(rack_positions):
        mesh = RACK_MESHES[rng.randrange(len(RACK_MESHES))]
        # Right row faces -x into the aisle; the left row is the same cabinet turned around.
        instance(mesh, f"Rack {side} {i}", (side * AISLE_X, ry, 0), rot=(0, 0, 0 if side > 0 else math.pi))  # no per-instance modifiers: 168 cabinets share one evaluated mesh

# Overhead ladder trays above each rack row, loaded with fibre that drops into every cabinet.
for side in (-1, 1):
    tray = Builder(f"Ladder tray {side}")
    length = ROW_Y0 - ROW_Y1 + 2
    cy = (ROW_Y0 + ROW_Y1) / 2
    for rail_x in (AISLE_X + 0.12, AISLE_X + 0.82):
        tray.box((side * rail_x, cy, 2.62), (0.03, length, 0.08), M["steel"])
    rung = ROW_Y0 + 0.5
    while rung > ROW_Y1 - 0.5:
        tray.box((side * (AISLE_X + 0.47), rung, 2.59), (0.7, 0.025, 0.012), M["steel"])
        rung -= 0.3
    for hz in range(int(length // 3)):
        hy = ROW_Y0 - hz * 3
        tray.box((side * (AISLE_X + 0.47), hy, 4.4), (0.02, 0.02, 3.6), M["steel"])           # ceiling hangers
    instance(tray.mesh(), f"Ladder tray {side}", (0, 0, 0))

    splines = []
    for i, ry in enumerate(rack_positions):
        for k in range(rng.randint(2, 4)):
            x0 = side * (AISLE_X + 0.25 + 0.12 * k)
            yy = ry + rng.uniform(-0.2, 0.2)
            splines.append(([(x0, yy, 2.64), (x0 - side * 0.05, yy, 2.45), (side * (AISLE_X + 0.2 + 0.1 * k), yy, RACK_H + 0.01)], rng.randrange(3)))
        # Bundled runs lying in the tray along the row.
        if i % 6 == 0 and i + 6 < len(rack_positions):
            for k in range(4):
                x0 = side * (AISLE_X + 0.3 + 0.1 * k)
                splines.append(([(x0, ry, 2.65 + 0.012 * k), (x0, ry - 1.8, 2.66), (x0, rack_positions[i + 6], 2.65 + 0.01 * k)], rng.randrange(3)))
    # Patch cords looping across rack fronts between neighbouring cabinets (sag towards the aisle).
    for i in range(0, len(rack_positions) - 2, 3):
        za, zb = rng.uniform(1.2, 1.9), rng.uniform(1.0, 1.8)
        ya, yb = rack_positions[i], rack_positions[i + 2]
        mid = ((ya + yb) / 2, min(za, zb) - rng.uniform(0.15, 0.35))
        splines.append(([(side * (AISLE_X - 0.01), ya, za), (side * (AISLE_X - 0.09), mid[0], mid[1]), (side * (AISLE_X - 0.01), yb, zb)], rng.randrange(3)))
    cable_set(f"Fibre {side}", splines, [M["fibre_white"], M["fibre_blue"], M["fibre_yellow"]], 0.006)

# The artifact's path: a yellow fibre raceway over the aisle carrying cyan signal strands.
raceway = Builder("Raceway")
raceway.box((0, -142.5, 3.05), (0.36, 56, 0.02), M["raceway"])
for s in (-1, 1):
    raceway.box((s * 0.18, -142.5, 3.1), (0.02, 56, 0.1), M["raceway"])
instance(raceway.mesh(), "Raceway", (0, 0, 0))
cable_set("Raceway signal", [([(x, -114.5, 3.08), (x, -142, 3.08), (x, -170, 3.08)], 0) for x in (-0.08, 0.0, 0.08)], [M["cyan"]], 0.01)

# Structure: steel I-beams across the hall, light fixtures with housings over the aisle.
for k, by in enumerate(range(-115, -177, -3)):
    beam = Builder(f"Beam {k}")
    beam.box((0, by, 5.5), (11.6, 0.3, 0.02), M["gunmetal"])
    beam.box((0, by, 5.32), (11.6, 0.3, 0.02), M["gunmetal"])
    beam.box((0, by, 5.41), (11.6, 0.02, 0.18), M["gunmetal"])
    instance(beam.mesh(), f"Beam {k}", (0, 0, 0))
for k, ly in enumerate(range(-117, -177, -4)):
    box(f"Fixture {k}", (0, ly, 4.35), (1.3, 0.34, 0.08), M["gunmetal"], bevel=0.01)
    box(f"Fixture diffuser {k}", (0, ly, 4.305), (1.2, 0.26, 0.01), M["white_panel"], bevel=0)
    area_light(f"Aisle light {k}", (0, ly, 4.28), 1.2, 85, (0.78, 0.9, 1.0), size_y=0.26)
for side in (-1, 1):
    area_light(f"Rack face {side}", (-side * 0.4, -143, 3.7), 0.4, 1100, (0.55, 0.8, 1.0), rot=(0, -side * math.radians(55), 0), size_y=58)
box("Aisle floor", (0, -143, 0.004), (2 * AISLE_X, 60, 0.008), M["perforated"], bevel=0)

# Production bay: a dedicated cabinet with an open slot for the release artifact.
prod = Builder("Prod rack")
prod.box((RACK_D / 2, 0, RACK_H / 2), (RACK_D, 1.2, RACK_H), M["dark_metal"])
prod.box((-0.004, 0, 1.55), (0.008, 1.1, 1.1), M["leds"])
prod.box((-0.004, 0, 0.75), (0.008, 1.1, 0.5), M["leds"])
prod.box((-0.006, 0, 1.1), (0.012, 0.9, 0.18), M["amber_soft"])        # the open slot
prod.box((-0.008, 0, 2.05), (0.006, 1.1, 0.16), M["display"])
instance(prod.mesh(), "Prod rack", (AISLE_X, bay_y, 0), bevel=0.003)
text("PRODUCTION  ·  HEALTHY", (AISLE_X - 0.02, bay_y, 2.0), 0.08, M["green"], rot=(math.pi / 2, 0, -math.pi / 2), align="CENTER")
area_light("Prod key", (0.2, bay_y + 1.0, 2.6), 1.2, 140, (1.0, 0.86, 0.72), rot=(0, -math.radians(60), 0))
# Containment end: glass sliding doors with frames close the aisle.
for s in (-1, 1):
    box(f"Door frame {s}", (s * 0.9, -175.5, 1.2), (0.06, 0.08, 2.4), M["steel"], bevel=0.01)
    box(f"Door glass {s}", (s * 0.45, -175.5, 1.2), (0.86, 0.02, 2.3), M["glass"], bevel=0)
box("Door header", (0, -175.5, 2.45), (3.6, 0.12, 0.12), M["steel"], bevel=0.01)
box("End wall", (0, -177, 3.0), (12, 0.2, 6.2), M["dark_metal"], bevel=0)

# --------------------------------------------------------------------------------------------
# Packet (the followed object) and its paths
# --------------------------------------------------------------------------------------------
def catmull(points, u):
    n = len(points) - 1
    x = min(max(u, 0.0), 1.0) * n
    i = min(int(x), n - 1)
    t = x - i
    p0 = Vector(points[max(i - 1, 0)])
    p1, p2 = Vector(points[i]), Vector(points[i + 1])
    p3 = Vector(points[min(i + 2, n)])
    t2, t3 = t * t, t * t * t
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)


def frame_to_t(f):
    return T_START + (T_END - T_START) * f / (N_FRAMES - 1)


# Keyframes as (frame, position). Frames 0–30 are the screen boundary and passage; the remaining
# beats (branch → commits → merge → tag → restore → build → test → package → corridor → production)
# are authored on a 240-frame grid and remapped onto frames 30..287.
PASSAGE = 30


def remap(f):
    return round(PASSAGE + f * (N_FRAMES - 1 - PASSAGE) / 239)


LATE_PACKET = [
    (0, (0.0, -3.0, 1.55)), (14, (0.0, -6.5, LANE_Z + 0.25)), (26, (-2.0, -15.5, LANE_Z + 0.25)),
    (38, (-2.0, -23.0, LANE_Z + 0.25)), (50, (0.0, -36.5, LANE_Z + 0.25)), (62, (0.0, -46.0, LANE_Z + 0.4)),
    (80, (0.0, -61.5, BELT_Z + 0.25)), (102, (0.0, -75.0, BELT_Z + 0.25)), (124, (0.0, -88.0, BELT_Z + 0.25)),
    (148, (0.0, -101.0, BELT_Z + 0.3)), (166, (0.0, -116.0, 1.3)), (200, (0.25, -146.0, 1.3)),
    (226, (1.0, -167.5, 1.15)), (239, (AISLE_X - 0.1, bay_y, 1.1)),
]
LATE_CAM = [
    (0, (0.0, 1.5, 1.9)), (14, (0.4, -0.5, 1.95)), (26, (-0.6, -8.5, 2.1)), (38, (-1.6, -15.0, 2.0)),
    (50, (-0.6, -28.0, 2.05)), (62, (0.3, -38.0, 2.2)), (80, (0.9, -54.0, 1.9)), (102, (-0.9, -67.5, 1.85)),
    (124, (0.9, -80.5, 1.85)), (148, (-0.6, -93.5, 1.95)), (166, (0.0, -108.0, 1.75)), (200, (-0.5, -138.0, 1.7)),
    (226, (-0.6, -161.0, 1.6)), (239, (-0.3, -165.8, 1.5)),
]
# The artifact starts ON the highlighted call in the code wall (matching the editor), lifts off the
# glass and leads the camera through the dissolving wall into the passage.
tp = token_pos
PACKET_KEYS = [(0, tuple(tp)), (8, (tp.x * 0.85, WALL_Y - 0.5, tp.z + 0.05)), (18, (tp.x * 0.35, 5.5, 1.45)),
               (PASSAGE, (0.0, 1.0, 1.5))] + [(remap(f), p) for f, p in LATE_PACKET[1:]]
CAM_KEYS = [(0, (0.0, WALL_Y + 3.4, 1.75)), (10, (0.0, WALL_Y + 1.9, 1.7)), (18, (0.0, WALL_Y - 1.2, 1.72)),
            (PASSAGE, (0.1, 4.0, 1.85))] + [(remap(f), p) for f, p in LATE_CAM[1:]]


def keyed(keys, f):
    frames = [k[0] for k in keys]
    for i in range(len(frames) - 1):
        if frames[i] <= f <= frames[i + 1]:
            local = (f - frames[i]) / max(1, frames[i + 1] - frames[i])
            u = (i + local) / (len(keys) - 1)
            return catmull([k[1] for k in keys], u)
    return Vector(keys[-1][1])


# The artifact: an amber octahedron — the same silhouette, colour and size as the live DOM packet.
PACKET_R = 0.11
pm = bpy.data.meshes.new("Packet")
bm = bmesh.new()
pv = [bm.verts.new(v) for v in ((PACKET_R, 0, 0), (-PACKET_R, 0, 0), (0, PACKET_R, 0), (0, -PACKET_R, 0), (0, 0, PACKET_R * 1.15), (0, 0, -PACKET_R * 1.15))]
for a, b2, c in ((0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)):
    bm.faces.new((pv[a], pv[b2], pv[c]))
bm.to_mesh(pm)
bm.free()
packet = bpy.data.objects.new("Packet", pm)
COLL.objects.link(packet)
packet.data.materials.append(M["packet"])
packet_light = point_light("Packet light", (0, 0, 0), 45, AMBER, 0.05)
packet_light.parent = packet
artifact = box("Artifact crate", (0, 0, 0), (0.42, 0.42, 0.42), M["glass"], bevel=0.03)
artifact.parent = packet

target = bpy.data.objects.new("Camera target", None)
COLL.objects.link(target)
cam_data = bpy.data.cameras.new("Camera")
cam_data.lens = 28 if VARIANT == "desktop" else 24
cam_data.sensor_fit = "VERTICAL" if VARIANT == "mobile" else "HORIZONTAL"
# Portrait: shift the frame so the artifact sits in the upper half, leaving a clean lower band for text.
cam_data.shift_y = -0.13 if VARIANT == "mobile" else 0.0
cam_data.dof.use_dof = True
cam_data.dof.focus_object = packet
cam_data.dof.aperture_fstop = 2.2
cam_data.clip_end = 400
camera = bpy.data.objects.new("Camera", cam_data)
COLL.objects.link(camera)
scene.camera = camera
track = camera.constraints.new("TRACK_TO")
track.target = target
track.track_axis = "TRACK_NEGATIVE_Z"
track.up_axis = "UP_Y"

wall_alpha = M["wall_glass"].node_tree.nodes["Principled BSDF"].inputs["Alpha"]
wall_text = M["wall_text"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
wall_token = M["wall_token"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
for f in range(N_FRAMES):
    p = keyed(PACKET_KEYS, f)
    c = keyed(CAM_KEYS, f)
    packet.location = p
    packet.rotation_euler = (0.0, 0.0, f * 0.06)  # spins about its vertical axis, like the DOM diamond
    packet.keyframe_insert("location", frame=f)
    packet.keyframe_insert("rotation_euler", frame=f)
    # From Package onward the packet carries its release artifact (glass crate).
    crate_from = remap(146)
    s = 0.001 if f < crate_from else min(1.0, (f - crate_from) / 8)
    artifact.scale = (s, s, s)
    artifact.keyframe_insert("scale", frame=f)
    camera.location = c
    camera.keyframe_insert("location", frame=f)
    if f < PASSAGE:
        # Face the code wall square-on (like the full-bleed editor), then hand over to packet-following.
        k = f / PASSAGE
        wall_view = Vector((0.0, WALL_Y - 10.0, 1.62))
        follow = p.lerp(keyed(PACKET_KEYS, min(N_FRAMES - 1, f + 10)), 0.35) + Vector((0, 0, 0.25))
        target.location = wall_view.lerp(follow, k * k * (3 - 2 * k))
    else:
        ahead = keyed(PACKET_KEYS, min(N_FRAMES - 1, f + 10))
        target.location = p.lerp(ahead, 0.35) + Vector((0, 0, 0.25))
    target.keyframe_insert("location", frame=f)
    # The wall dissolves as the camera reaches it (mirrors the DOM editor fading out).
    fade = 1.0 - min(1.0, max(0.0, (f - 4) / 10))
    wall_alpha.default_value = 0.85 * fade
    wall_text.default_value = 2.6 * fade
    wall_token.default_value = 4.0 * fade
    for sock in (wall_alpha, wall_text, wall_token):
        sock.keyframe_insert("default_value", frame=f)

# Linear interpolation: every frame is keyed explicitly, so scrubbing is exact.
for obj in (packet, camera, target, artifact, *[M[k] for k in ("wall_glass", "wall_text", "wall_token")]):
    if obj.animation_data and obj.animation_data.action:
        action = obj.animation_data.action
        curves = getattr(action, "fcurves", None)
        if curves is None:  # Blender 4.4+ layered actions
            curves = [fc for layer in action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
        for fc in curves:
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"

# Compositor: restrained bloom only (no lens flares).
scene.use_nodes = True
tree = scene.node_tree
try:
    rl = tree.nodes.get("Render Layers") or tree.nodes.new("CompositorNodeRLayers")
    comp = tree.nodes.get("Composite") or tree.nodes.new("CompositorNodeComposite")
    glare = tree.nodes.new("CompositorNodeGlare")
    for kind in ("BLOOM", "FOG_GLOW"):
        try:
            glare.glare_type = kind
            break
        except TypeError:
            continue
    for attr, value in (("quality", "HIGH"), ("mix", -0.55), ("threshold", 1.2), ("size", 7)):
        if hasattr(glare, attr):
            try:
                setattr(glare, attr, value)
            except (TypeError, AttributeError):
                pass
    for name, value in (("Strength", 0.45), ("Threshold", 1.2), ("Size", 0.6)):
        if name in glare.inputs:
            glare.inputs[name].default_value = value
    tree.links.new(rl.outputs["Image"], glare.inputs[0])
    tree.links.new(glare.outputs[0], comp.inputs[0])
except Exception as exc:  # compositor API differences must never block a render
    print("Compositor skipped:", exc)

# --------------------------------------------------------------------------------------------
# Output
# --------------------------------------------------------------------------------------------
def export_packet():
    out_dir = os.path.join(ROOT, "public", "cinematic", "pipeline", VARIANT)
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for f in range(N_FRAMES):
        scene.frame_set(f)
        bpy.context.view_layer.update()
        co = world_to_camera_view(scene, camera, packet.matrix_world.translation)
        visible = 1 if (0 <= co.x <= 1 and 0 <= co.y <= 1 and co.z > 0) else 0
        # Projected radius (fraction of frame height) so the DOM packet matches the rendered size at hand-off.
        cam_right = camera.matrix_world.to_3x3() @ Vector((1, 0, 0))
        edge = world_to_camera_view(scene, camera, packet.matrix_world.translation + cam_right * PACKET_R)
        radius = abs(edge.x - co.x) * scene.render.resolution_x / scene.render.resolution_y
        rows.append([round(co.x, 4), round(1 - co.y, 4), round(co.z, 3), visible, round(radius, 5)])
    meta = {"frames": N_FRAMES, "tStart": T_START, "tEnd": T_END,
            "width": scene.render.resolution_x, "height": scene.render.resolution_y,
            "packet": rows, "beats": {"passage": [0, PASSAGE], "git": [PASSAGE, remap(63)], "ci": [remap(64), remap(152)], "deploy": [remap(153), N_FRAMES - 1]},
            "generator": "blender/scripts/pipeline_scene.py", "blender": bpy.app.version_string}
    with open(os.path.join(out_dir, "packet.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, separators=(",", ":"))
    print("Packet path written:", out_dir)


if MODE == "export":
    export_packet()
elif MODE == "save":
    os.makedirs(os.path.join(ROOT, "blender", "scenes"), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender", "scenes", f"pipeline_{VARIANT}.blend"))
else:
    out_dir = os.path.join(ROOT, "blender", "renders", OUT_NAME)
    os.makedirs(out_dir, exist_ok=True)
    frames = [int(x) for x in FRAMES_ARG.split(",") if x] if FRAMES_ARG else range(N_FRAMES)
    for f in frames:
        scene.frame_set(f)
        scene.render.filepath = os.path.join(out_dir, f"{f:04d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"Rendered frame {f}")
    if EXPORT:
        export_packet()
