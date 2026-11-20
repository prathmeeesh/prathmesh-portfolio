"""Engineering Observatory — rendered pipeline sequence, v3 "Luminous facility".

From the editor's code, through the display's own layers (glyphs → colour-filter sub-pixels → TFT
matrix → backlight), out into a dawn engineering landscape: the Git sky-bridge, the sky-lit CI hall
(restore → build → test → package) and the server road that leads to the deployment gateway.
Fully procedural: run headless and the whole scene is rebuilt from this file.

    blender -b --factory-startup -P blender/scripts/pipeline_scene.py -- \
        --variant desktop --mode render [--frames 0,60,120] [--samples 32] [--scale 100] \
        [--out preview-desktop] [--no-export 1]

    --variant  desktop (1280x720) | mobile (540x960 portrait, its own lens and framing)
    --mode     render -> PNG frames in blender/renders/<out or variant>/ (+ packet.json unless --no-export 1)
               export -> public/cinematic/pipeline/<variant>/packet.json only
               save   -> blender/scenes/pipeline_<variant>.blend for inspection

The followed artifact's projected screen position (and size) is exported per frame, so the website's live
DOM packet hands off to the rendered one at exactly the right pixel. The previous corridor version is kept
in blender/scripts/archive/pipeline_scene_corridor_v2.py.
"""

import json
import math
import os
import random
import sys

import bmesh
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector, noise

# ----------------------------------------------------------------------------------------------
# Arguments and constants
# ----------------------------------------------------------------------------------------------
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []


def arg(name, default):
    flag = f"--{name}"
    return argv[argv.index(flag) + 1] if flag in argv else default


VARIANT = arg("variant", "desktop")
MODE = arg("mode", "render")
SAMPLES = int(arg("samples", "32"))
SCALE = int(arg("scale", "100"))
FRAMES_ARG = arg("frames", "")
OUT_NAME = arg("out", VARIANT)
if not OUT_NAME.replace("-", "").isalnum():
    raise SystemExit(f"bad --out {OUT_NAME!r}")
EXPORT = arg("no-export", "0") != "1"
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

N_FRAMES = 288                 # frames 0..287
T_START, T_END = 1.42, 3.95    # chapter progress covered (kept in sync with pipeline.js / opening.js)
FONT_MONO = "C:/Windows/Fonts/consola.ttf"   # Consolas: Cascadia Mono (variable font) mis-maps glyphs in Blender
FONT_SANS = "C:/Windows/Fonts/segoeuib.ttf"
random.seed(7)


def srgb(hex_code):
    """CSS hex -> linear RGB (Blender colours are linear)."""
    h = hex_code.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


CYAN = (0.20, 0.85, 0.82)
AMBER = (1.0, 0.55, 0.18)
GREEN = (0.30, 0.95, 0.50)
VIOLET = (0.55, 0.48, 1.0)
WARM_SUN = (1.0, 0.72, 0.46)

# ----------------------------------------------------------------------------------------------
# Scene and render settings
# ----------------------------------------------------------------------------------------------
bpy.ops.wm.read_factory_settings(use_empty=True)
# Low-RAM machine: compile GPU shaders one at a time (parallel compiles ran the driver out of memory).
_sys = bpy.context.preferences.system
for attr, value in (("shader_compilation_method", "THREAD"), ("gpu_shader_workers", 1), ("max_shader_compilation_subprocesses", 1)):
    if hasattr(_sys, attr):
        try:
            setattr(_sys, attr, value)
        except (TypeError, AttributeError, ValueError):
            pass
scene = bpy.context.scene
scene.frame_start, scene.frame_end = 0, N_FRAMES - 1
for engine in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE"):
    try:
        scene.render.engine = engine
        break
    except TypeError:
        continue

ee = scene.eevee


def try_set(obj, attr, value):
    if hasattr(obj, attr):
        try:
            setattr(obj, attr, value)
        except (TypeError, AttributeError, ValueError):
            pass


ee.taa_render_samples = SAMPLES
for attr, value in (("use_raytracing", True), ("use_shadows", True), ("use_fast_gi", True),
                    ("fast_gi_method", "GLOBAL_ILLUMINATION"), ("volumetric_tile_size", "8"),
                    ("volumetric_samples", 48), ("volumetric_start", 0.5), ("volumetric_end", 260.0),
                    ("use_volumetric_shadows", True), ("shadow_pool_size", "512"), ("shadow_ray_count", 2),
                    ("shadow_step_count", 8), ("use_gtao", True), ("gtao_distance", 1.5)):
    try_set(ee, attr, value)
if hasattr(ee, "ray_tracing_options"):
    try_set(ee.ray_tracing_options, "resolution_scale", "2")
    try_set(ee.ray_tracing_options, "trace_max_roughness", 0.6)

if VARIANT == "mobile":
    scene.render.resolution_x, scene.render.resolution_y = 540, 960
else:
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
scene.render.resolution_percentage = SCALE
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.film_transparent = False
scene.render.use_motion_blur = False   # stills for scrubbing
scene.view_settings.view_transform = "AgX"
try:
    scene.view_settings.look = "AgX - Medium High Contrast"
except TypeError:
    pass
scene.view_settings.exposure = -0.35
bpy.context.view_layer.use_pass_mist = True

# ----------------------------------------------------------------------------------------------
# Sky: dawn gradient with a sun disc and halo, sun direction shared with the sun lamp.
# ----------------------------------------------------------------------------------------------
SUN_ELEV = math.radians(13.0)
SUN_DIR = Vector((0.0, -math.cos(SUN_ELEV), math.sin(SUN_ELEV)))   # from the scene toward the sun

world = bpy.data.worlds.new("Dawn")
scene.world = world
world.use_nodes = True
wt = world.node_tree
wn, wl = wt.nodes, wt.links
bg = wn["Background"]
coord = wn.new("ShaderNodeTexCoord")
sep = wn.new("ShaderNodeSeparateXYZ")
wl.new(coord.outputs["Generated"], sep.inputs[0])
height = wn.new("ShaderNodeMapRange")
height.inputs["From Min"].default_value = -0.05
height.inputs["From Max"].default_value = 0.65
wl.new(sep.outputs["Z"], height.inputs["Value"])
ramp = wn.new("ShaderNodeValToRGB")
els = ramp.color_ramp.elements
els[0].position, els[0].color = 0.0, (1.0, 0.46, 0.20, 1)
els[1].position, els[1].color = 1.0, (0.03, 0.10, 0.34, 1)
for pos, col in ((0.07, (0.98, 0.60, 0.36, 1)), (0.2, (0.62, 0.62, 0.70, 1)), (0.38, (0.24, 0.42, 0.78, 1)), (0.65, (0.09, 0.22, 0.56, 1))):
    e = els.new(pos)
    e.color = col
wl.new(height.outputs["Result"], ramp.inputs["Fac"])
# Sun halo and disc from the angle to the sun.
dotn = wn.new("ShaderNodeVectorMath")
dotn.operation = "DOT_PRODUCT"
dotn.inputs[1].default_value = SUN_DIR
wl.new(coord.outputs["Generated"], dotn.inputs[0])
halo = wn.new("ShaderNodeMapRange")
halo.inputs["From Min"].default_value = 0.55
halo.inputs["From Max"].default_value = 1.0
wl.new(dotn.outputs["Value"], halo.inputs["Value"])
halo_pow = wn.new("ShaderNodeMath")
halo_pow.operation = "POWER"
halo_pow.inputs[1].default_value = 5.0
wl.new(halo.outputs["Result"], halo_pow.inputs[0])
disc = wn.new("ShaderNodeMapRange")
disc.inputs["From Min"].default_value = 0.99955
disc.inputs["From Max"].default_value = 0.99975
disc.inputs["To Max"].default_value = 24.0
wl.new(dotn.outputs["Value"], disc.inputs["Value"])
glow = wn.new("ShaderNodeMath")
glow.operation = "MULTIPLY_ADD"
glow.inputs[1].default_value = 1.6
wl.new(halo_pow.outputs[0], glow.inputs[0])
wl.new(disc.outputs["Result"], glow.inputs[2])
sun_col = wn.new("ShaderNodeMix")
sun_col.data_type = "RGBA"
sun_col.blend_type = "ADD"
sun_col.inputs["Factor"].default_value = 1.0
wl.new(ramp.outputs["Color"], sun_col.inputs[6])
tint = wn.new("ShaderNodeMix")
tint.data_type = "RGBA"
tint.blend_type = "MULTIPLY"
tint.inputs["Factor"].default_value = 1.0
tint.inputs[7].default_value = (*WARM_SUN, 1)
wl.new(glow.outputs[0], tint.inputs[6])
wl.new(tint.outputs[2], sun_col.inputs[7])
wl.new(sun_col.outputs[2], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 1.0
world.mist_settings.start = 70.0
world.mist_settings.depth = 1100.0
world.mist_settings.falloff = "QUADRATIC"

# ----------------------------------------------------------------------------------------------
# Materials
# ----------------------------------------------------------------------------------------------
def principled(name, color, metallic=0.0, roughness=0.45, emission=None, strength=0.0, coat=0.0,
               alpha=1.0, transmission=0.0, specular=0.5):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in b.inputs:
        b.inputs["Specular IOR Level"].default_value = specular
    if "Coat Weight" in b.inputs:
        b.inputs["Coat Weight"].default_value = coat
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1)
        b.inputs["Emission Strength"].default_value = strength
    if transmission:
        b.inputs["Transmission Weight"].default_value = transmission
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        try_set(mat, "surface_render_method", "DITHERED")
    return mat


def emissive(name, color, strength):
    return principled(name, (0.02, 0.02, 0.02), roughness=0.5, emission=color, strength=strength)


def brushed(name, color, roughness=0.32, metallic=1.0):
    mat = principled(name, color, metallic=metallic, roughness=roughness)
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0, 1.0, 40.0)
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 14.0
    nz.inputs["Detail"].default_value = 6.0
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = max(0.02, roughness - 0.08)
    mr.inputs["To Max"].default_value = roughness + 0.1
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], nz.inputs["Vector"])
    nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], b.inputs["Roughness"])
    return mat


def panelled(name, color, seam=(0.012, 0.014, 0.018), width=2.4, height=1.2, roughness=0.42, metallic=0.6):
    """Architectural cladding: panels with dark seams (brick texture on object coords)."""
    mat = principled(name, color, metallic=metallic, roughness=roughness)
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset = 0.0
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Brick Width"].default_value = width
    br.inputs["Row Height"].default_value = height
    br.inputs["Mortar Size"].default_value = 0.025
    br.inputs["Color1"].default_value = (*color, 1)
    br.inputs["Color2"].default_value = (*[c * 0.86 for c in color], 1)
    br.inputs["Mortar"].default_value = (*seam, 1)
    nt.links.new(tc.outputs["Object"], br.inputs["Vector"])
    nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.35
    nt.links.new(br.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return mat


def glass(name, tint=(0.75, 0.88, 0.95), alpha=0.22, roughness=0.03):
    mat = principled(name, tint, roughness=roughness, alpha=alpha, transmission=0.0, specular=1.0, coat=1.0)
    return mat


def concrete(name):
    """Polished concrete: slab joints only (kept cheap: complex shaders failed to compile on this GPU)."""
    mat = principled(name, (0.34, 0.345, 0.35), roughness=0.5, specular=0.4)
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset = 0.0
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Brick Width"].default_value = 6.0
    br.inputs["Row Height"].default_value = 6.0
    br.inputs["Mortar Size"].default_value = 0.012
    br.inputs["Color1"].default_value = (0.34, 0.345, 0.35, 1)
    br.inputs["Color2"].default_value = (0.30, 0.305, 0.31, 1)
    br.inputs["Mortar"].default_value = (0.08, 0.08, 0.085, 1)
    nt.links.new(tc.outputs["Object"], br.inputs["Vector"])
    nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
    return mat


def ground_mat(name):
    mat = principled(name, (0.48, 0.33, 0.22), roughness=0.85, specular=0.3)
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 0.02
    nz.inputs["Detail"].default_value = 8.0
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (0.30, 0.19, 0.12, 1)
    cr.color_ramp.elements[1].color = (0.62, 0.45, 0.30, 1)
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    nt.links.new(nz.outputs["Fac"], cr.inputs["Fac"])
    nt.links.new(cr.outputs["Color"], b.inputs["Base Color"])
    fine = nt.nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 3.0
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.4
    nt.links.new(tc.outputs["Object"], fine.inputs["Vector"])
    nt.links.new(fine.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return mat


def math_node(nt, op, a=None, b=None, c=None):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    for i, v in enumerate((a, b, c)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def mask_shader(name, build_color_and_mask, strength):
    """Emission where mask = 1, fully transparent elsewhere (the camera can fly through the gaps)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sx = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sx.inputs[0])
    color, mask = build_color_and_mask(nt, sx.outputs["X"], sx.outputs["Z"])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = strength
    nt.links.new(color, em.inputs["Color"])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(mask, mix.inputs["Fac"])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    try_set(mat, "surface_render_method", "BLENDED")   # crisp masks (no dither noise at preview sample counts)
    return mat, em


def _obj_coords(nt):
    tc = [n for n in nt.nodes if n.bl_idname == "ShaderNodeTexCoord"][0]
    return tc.outputs["Object"]


def subpixel_layer(nt, x, z):
    """LCD colour filter (kept to a handful of nodes: big node graphs failed to compile on this GPU).
    Brick mortar = black matrix; brick colour = per-cell brightness; x wrapped by pitch = R/G/B column."""
    pitch = 0.62
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset = 0.0
    br.squash = 1.0
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Brick Width"].default_value = pitch / 3
    br.inputs["Row Height"].default_value = pitch
    br.inputs["Mortar Size"].default_value = 0.022
    br.inputs["Bias"].default_value = -0.6
    br.inputs["Color1"].default_value = (1.0, 1.0, 1.0, 1)
    br.inputs["Color2"].default_value = (0.22, 0.22, 0.22, 1)
    vec = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(x, vec.inputs["X"])
    nt.links.new(z, vec.inputs["Y"])
    nt.links.new(vec.outputs[0], br.inputs["Vector"])
    col = math_node(nt, "DIVIDE", math_node(nt, "WRAP", x, pitch, 0.0), pitch)
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.interpolation = "CONSTANT"
    e = cr.color_ramp.elements
    e[0].position, e[0].color = 0.0, (1.0, 0.07, 0.05, 1)
    e[1].position, e[1].color = 0.6667, (0.10, 0.22, 1.0, 1)
    g = e.new(0.3333)
    g.color = (0.08, 1.0, 0.30, 1)
    nt.links.new(col, cr.inputs["Fac"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(cr.outputs["Color"], mul.inputs[6])
    nt.links.new(br.outputs["Color"], mul.inputs[7])
    mask = math_node(nt, "SUBTRACT", 1.0, br.outputs["Fac"])
    return mul.outputs[2], mask


def tft_layer(nt, x, z):
    """Thin-film transistor matrix: fine gold traces = brick mortar."""
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset = 0.0
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Brick Width"].default_value = 0.62
    br.inputs["Row Height"].default_value = 0.62
    br.inputs["Mortar Size"].default_value = 0.014
    vec = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(x, vec.inputs["X"])
    nt.links.new(z, vec.inputs["Y"])
    nt.links.new(vec.outputs[0], br.inputs["Vector"])
    col = nt.nodes.new("ShaderNodeRGB")
    col.outputs[0].default_value = (1.0, 0.62, 0.25, 1)
    return col.outputs[0], br.outputs["Fac"]


M = {
    "steel": brushed("Brushed steel", (0.62, 0.64, 0.67), 0.28),
    "dark": brushed("Graphite metal", (0.06, 0.07, 0.085), 0.34),
    "gunmetal": brushed("Gunmetal", (0.20, 0.22, 0.25), 0.3),
    "white_metal": principled("Pearl enamel", (0.80, 0.82, 0.84), metallic=0.3, roughness=0.28, coat=0.6),
    "concrete": concrete("Polished concrete"),
    "ground": ground_mat("Desert"),
    "asphalt": principled("Asphalt", (0.04, 0.042, 0.045), roughness=0.82, specular=0.35),
    "glass": glass("Glass"),
    "glass_blue": glass("Blue glass", (0.45, 0.70, 0.90), alpha=0.32),
    "deck": glass("Deck glass", (0.55, 0.80, 0.90), alpha=0.42, roughness=0.06),
    "facade": panelled("Server cladding", (0.26, 0.28, 0.31), width=1.8, height=0.9),
    "facade_light": panelled("Light cladding", (0.55, 0.57, 0.60), width=2.4, height=1.2, metallic=0.4, roughness=0.35),
    "walkway": panelled("Walkway", (0.22, 0.235, 0.25), width=1.2, height=2.4, metallic=0.1, roughness=0.7),
    "hall_wall": panelled("Hall wall", (0.30, 0.32, 0.35), width=3.0, height=1.5),
    "cyan": emissive("Cyan light", CYAN, 9.0),
    "cyan_soft": emissive("Cyan soft", CYAN, 3.0),
    "amber": emissive("Amber light", AMBER, 9.0),
    "amber_soft": emissive("Amber soft", AMBER, 3.5),
    "green": emissive("Green light", GREEN, 6.0),
    "violet": emissive("Violet light", VIOLET, 6.0),
    "white_led": emissive("White LED", (0.85, 0.92, 1.0), 6.0),
    "label": emissive("Label", (0.86, 0.95, 0.98), 2.6),
    "label_dark": principled("Sign ink", (0.02, 0.03, 0.04), roughness=0.4),
    "rubber": principled("Belt rubber", (0.025, 0.027, 0.03), roughness=0.75),
    "robot": principled("Robot paint", (0.95, 0.42, 0.06), metallic=0.2, roughness=0.3, coat=0.7),
    "crate_box": principled("Package crate", (0.36, 0.42, 0.50), metallic=0.5, roughness=0.36),
    "display": principled("Display glass", (0.01, 0.015, 0.025), roughness=0.06, coat=1.0),
    "packet": emissive("Packet core", AMBER, 6.0),
    "hazard": principled("Hazard stripe", (0.85, 0.62, 0.05), roughness=0.4),
}
M["subpixel"], SUBPIXEL_EMIT = mask_shader("Colour filter", subpixel_layer, 1.8)
M["tft"], TFT_EMIT = mask_shader("TFT matrix", tft_layer, 1.6)
M["backlight"] = emissive("Backlight", (0.30, 0.75, 0.95), 0.5)
# Light-guide plate: a grid of brighter LED dots on a dim cyan field (one brick node, cheap to compile).
_bl = M["backlight"].node_tree
_bb = _bl.nodes["Principled BSDF"]
_tc = _bl.nodes.new("ShaderNodeTexCoord")
_sx = _bl.nodes.new("ShaderNodeSeparateXYZ")
_v = _bl.nodes.new("ShaderNodeCombineXYZ")
_bl.links.new(_tc.outputs["Object"], _sx.inputs[0])
_bl.links.new(_sx.outputs["X"], _v.inputs["X"])
_bl.links.new(_sx.outputs["Z"], _v.inputs["Y"])
_br = _bl.nodes.new("ShaderNodeTexBrick")
_br.offset = 0.5
_br.inputs["Scale"].default_value = 1.0
_br.inputs["Brick Width"].default_value = 0.9
_br.inputs["Row Height"].default_value = 0.9
_br.inputs["Mortar Size"].default_value = 0.36
_br.inputs["Color1"].default_value = (1.0, 1.0, 1.0, 1)
_br.inputs["Color2"].default_value = (0.8, 0.95, 1.0, 1)
_br.inputs["Mortar"].default_value = (0.05, 0.16, 0.24, 1)
_bl.links.new(_v.outputs[0], _br.inputs["Vector"])
_bl.links.new(_br.outputs["Color"], _bb.inputs["Emission Color"])

# Code panel colours = the website editor's CSS (journey.css), so the first frames match the DOM editor.
CODE_COLORS = {"k": "#8fb6ff", "t": "#6fe0d4", "s": "#f6be82", "m": "#ead98f", "p": "#8ea9b6", "n": "#d7e6ec", "token": "#ead98f"}
CODE_MATS = {k: emissive(f"Code {k}", srgb(v), 3.2) for k, v in CODE_COLORS.items()}
CODE_MATS["token"] = emissive("Code token", srgb("#ffd9a8"), 5.0)
CODE_MATS["gutter"] = emissive("Code gutter", srgb("#4f6b78"), 2.0)
M["code_bg"] = principled("Editor background", (0.0, 0.0, 0.0), roughness=1.0, emission=srgb("#08131f"), strength=1.0, specular=0.0)
M["token_glow"] = emissive("Token highlight", srgb("#f6be82"), 1.4)

# ----------------------------------------------------------------------------------------------
# Geometry helpers
# ----------------------------------------------------------------------------------------------
COLL = scene.collection


def link(obj):
    COLL.objects.link(obj)
    return obj


def box(name, loc, size, mat, bevel=0.0, segments=2, shadow=True):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]
        v.co.y *= size[1]
        v.co.z *= size[2]
    bm.to_mesh(mesh)
    bm.free()
    obj = link(bpy.data.objects.new(name, mesh))
    obj.location = loc
    mesh.materials.append(mat)
    if bevel > 0:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "ANGLE"
        try_set(mod, "harden_normals", True)
    obj.visible_shadow = shadow
    return obj


class Builder:
    """Accumulates many parts into ONE mesh with material slots (shared by every instance)."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.mats = []

    def _slot(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _finish(self, verts, mat, rot=None, center=(0, 0, 0)):
        if rot is not None:
            bmesh.ops.rotate(self.bm, verts=verts, cent=(0, 0, 0), matrix=rot)
        bmesh.ops.translate(self.bm, vec=center, verts=verts)
        idx = self._slot(mat)
        for face in {f for v in verts for f in v.link_faces}:
            face.material_index = idx

    def box(self, center, size, mat, rot=None):
        verts = bmesh.ops.create_cube(self.bm, size=1.0)["verts"]
        bmesh.ops.scale(self.bm, vec=size, verts=verts)
        self._finish(verts, mat, rot, center)

    def cyl(self, center, radius, depth, mat, axis="Z", segments=16, radius2=None, rot=None):
        verts = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=segments, radius1=radius,
                                      radius2=radius if radius2 is None else radius2, depth=depth)["verts"]
        base = None
        if axis == "X":
            base = Matrix.Rotation(math.pi / 2, 3, "Y")
        elif axis == "Y":
            base = Matrix.Rotation(math.pi / 2, 3, "X")
        if base is not None:
            bmesh.ops.rotate(self.bm, verts=verts, cent=(0, 0, 0), matrix=base)
        self._finish(verts, mat, rot, center)

    def sphere(self, center, radius, mat, segs=16):
        verts = bmesh.ops.create_uvsphere(self.bm, u_segments=segs, v_segments=max(6, segs // 2), radius=radius)["verts"]
        self._finish(verts, mat, None, center)

    def mesh(self):
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        for mat in self.mats:
            mesh.materials.append(mat)
        for poly in mesh.polygons:
            poly.use_smooth = False
        return mesh


def instance(mesh, name, loc=(0, 0, 0), rot=(0, 0, 0), bevel=0.0, shadow=True):
    obj = link(bpy.data.objects.new(name, mesh))
    obj.location = loc
    obj.rotation_euler = rot
    if bevel:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        mod.limit_method = "ANGLE"
        try_set(mod, "harden_normals", True)
    obj.visible_shadow = shadow
    return obj


FACE_CAMERA = (math.pi / 2, 0, math.pi)   # text readable from +Y looking toward -Y (local +X -> world -X)


def text(body, loc, size, mat, font=FONT_MONO, rot=FACE_CAMERA, align="LEFT", extrude=0.0):
    curve = bpy.data.curves.new(name=f"txt_{body[:14]}", type="FONT")
    curve.body = body
    curve.size = size
    curve.extrude = extrude
    curve.align_x = align
    try:
        curve.font = bpy.data.fonts.load(font, check_existing=True)
    except RuntimeError:
        pass
    obj = link(bpy.data.objects.new(curve.name, curve))
    obj.location = loc
    obj.rotation_euler = rot
    obj.data.materials.append(mat)
    obj.visible_shadow = False
    return obj


def mono_advance(size):
    """Measured advance of the monospace font at `size` (no guessing at font metrics)."""
    widths = []
    for n in (10, 30):
        o = text("|" + "x" * n + "|", (0, 0, -500), size, M["label"])
        bpy.context.view_layer.update()
        widths.append(o.dimensions.x)
        curve = o.data
        bpy.data.objects.remove(o)
        bpy.data.curves.remove(curve)
    return (widths[1] - widths[0]) / 20


def tube(name, points, radius, mat, resolution=10, shadow=True):
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
    obj = link(bpy.data.objects.new(name, curve))
    obj.data.materials.append(mat)
    obj.visible_shadow = shadow
    return obj


def area_light(name, loc, size, power, color=(1, 1, 1), rot=(0, 0, 0), size_y=None, shadow=True):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.color = color
    data.shape = "RECTANGLE"
    data.size = size
    data.size_y = size_y or size
    try_set(data, "use_shadow", shadow)
    obj = link(bpy.data.objects.new(name, data))
    obj.location = loc
    obj.rotation_euler = rot
    return obj


def point_light(name, loc, power, color, radius=0.1):
    data = bpy.data.lights.new(name, "POINT")
    data.energy = power
    data.color = color
    data.shadow_soft_size = radius
    obj = link(bpy.data.objects.new(name, data))
    obj.location = loc
    return obj


def sun(name, rot, strength, color, angle=0.6, shadow=True):
    data = bpy.data.lights.new(name, "SUN")
    data.energy = strength
    data.color = color
    data.angle = math.radians(angle)
    try_set(data, "use_shadow", shadow)
    obj = link(bpy.data.objects.new(name, data))
    obj.rotation_euler = rot
    return obj


# Key light: low dawn sun beyond the gateway (light travels +Y, 10° down). Fill: cool sky from behind.
sun("Dawn sun", (math.pi / 2 - SUN_ELEV, 0, 0), 3.4, WARM_SUN, angle=0.8)
sun("Sky fill", (math.radians(-55), 0, math.radians(18)), 0.75, (0.62, 0.74, 1.0), angle=8, shadow=False)

# ----------------------------------------------------------------------------------------------
# 0. Display crossing (sky, Y 46 → 28): code glyphs → colour filter → TFT matrix → backlight.
# ----------------------------------------------------------------------------------------------
DZ = 26.0                 # display centre height
Y_CODE, Y_FILTER, Y_TFT, Y_BACK = 40.0, 37.0, 34.0, 30.0
CODE = [
    [("p", "["), ("t", "ApiController"), ("p", "]")],
    [("p", "["), ("t", "Route"), ("p", "("), ("s", "\"api/books\""), ("p", ")]")],
    [("k", "public class "), ("t", "BooksController"), ("p", "("), ("t", "IBookService"), ("n", " service"), ("p", ")")],
    [("p", "    : "), ("t", "ControllerBase")],
    [("p", "{")],
    [("n", "    "), ("p", "["), ("t", "HttpGet"), ("p", "]")],
    [("k", "    public async "), ("t", "Task"), ("p", "<"), ("t", "IActionResult"), ("p", "> "), ("m", "Search"), ("p", "(")],
    [("n", "        "), ("p", "["), ("t", "FromQuery"), ("p", "] "), ("k", "string"), ("n", " query"), ("p", ")")],
    [("p", "    {")],
    [("k", "        var"), ("n", " books = "), ("k", "await "), ("token", "service.SearchAsync(query)"), ("p", ";")],
    [("k", "        return "), ("m", "Ok"), ("p", "("), ("n", "books"), ("p", ");")],
    [("p", "    }")],
    [("p", "}")],
]
CODE_SIZE = 0.40
LINE_H = CODE_SIZE * 1.75   # same 1.75 line-height as the CSS editor
ADV = mono_advance(CODE_SIZE)
TOKEN_LINE = 9
prefix_cols = sum(len(s) for k, s in CODE[TOKEN_LINE][:3])
token_cols = len(CODE[TOKEN_LINE][3][1])
X0 = (prefix_cols + token_cols / 2) * ADV          # token centre lands on x = 0 (screen centre)
code_objs = []
for i, line in enumerate(CODE):
    z = DZ - (i - TOKEN_LINE) * LINE_H - CODE_SIZE * 0.33
    col = 0
    for kind, seg in line:
        stripped = seg.lstrip(" ")
        col += len(seg) - len(stripped)
        if stripped:
            code_objs.append(text(stripped, (X0 - col * ADV, Y_CODE, z), CODE_SIZE, CODE_MATS[kind]))
        col += len(stripped)
    code_objs.append(text(f"{i + 1:02d}", (X0 + 2.0, Y_CODE, z), CODE_SIZE, CODE_MATS["gutter"]))
TOKEN_POS = Vector((0.0, Y_CODE + 0.02, DZ))
token_box = box("Token highlight", (0.0, Y_CODE - 0.02, DZ), (token_cols * ADV + 0.2, 0.01, LINE_H * 0.95), M["token_glow"], shadow=False)
code_bg = box("Editor surface", (0, Y_CODE - 0.06, DZ - 1.0), (70, 0.02, 40), M["code_bg"], shadow=False)
box("Colour filter", (0, Y_FILTER, DZ), (70, 0.01, 40), M["subpixel"], shadow=False)
box("TFT matrix", (0, Y_TFT, DZ), (70, 0.01, 40), M["tft"], shadow=False)
backlight = box("Backlight", (0, Y_BACK, DZ), (70, 0.02, 40), M["backlight"], shadow=False)

# ----------------------------------------------------------------------------------------------
# Ground: dawn desert with gentle dunes, flattened under the facility.
# ----------------------------------------------------------------------------------------------
def build_ground():
    n, size, cy = 180, 2400.0, -260.0
    verts, faces = [], []
    for j in range(n + 1):
        for i in range(n + 1):
            x = -size / 2 + size * i / n
            y = cy - size / 2 + size * j / n
            # Distance from the facility corridor (|x| < 70, y in [-420, 40]) controls dune height.
            dx = max(0.0, abs(x) - 70.0)
            dy = max(0.0, y - 40.0, -420.0 - y)
            far = 0.0
            d = math.hypot(dx, dy)
            k = min(1.0, d / 160.0)
            h = 0.0
            amp, freq = 9.0, 0.004
            for _ in range(4):
                h += amp * noise.noise(Vector((x * freq, y * freq, 0.37)))
                amp *= 0.45
                freq *= 2.3
            # Far mesas: flat-topped ridges beyond ~650 m give the horizon depth (hazed by the mist pass).
            far = max(0.0, math.hypot(x, y - cy) - 650.0)
            if far > 0:
                m = noise.noise(Vector((x * 0.0022, y * 0.0022, 2.1)))
                mesa = min(1.0, max(0.0, (m + 0.05) * 3.0))
                h += mesa * min(1.0, far / 200.0) * 70.0
            verts.append((x, y, h * max(k * k, min(1.0, far / 150.0)) - 0.05))
    for j in range(n):
        for i in range(n):
            a = j * (n + 1) + i
            faces.append((a, a + 1, a + n + 2, a + n + 1))
    mesh = bpy.data.meshes.new("Ground")
    mesh.from_pydata(verts, [], faces)
    for p in mesh.polygons:
        p.use_smooth = True
    mesh.materials.append(M["ground"])
    link(bpy.data.objects.new("Ground", mesh))


build_ground()

# ----------------------------------------------------------------------------------------------
# 1. Git sky-bridge (Y 18 → -124): glass deck descending to the CI hall; main / feature / release rails.
# ----------------------------------------------------------------------------------------------
BRIDGE_Y0, BRIDGE_Y1 = 18.0, -124.0
DECK_Z0, DECK_Z1 = 21.6, 1.2


def deck_z(y):
    y = min(BRIDGE_Y0, max(BRIDGE_Y1, y))
    return DECK_Z1 + (y - BRIDGE_Y1) * (DECK_Z0 - DECK_Z1) / (BRIDGE_Y0 - BRIDGE_Y1)


SLOPE = math.atan((DECK_Z0 - DECK_Z1) / (BRIDGE_Y0 - BRIDGE_Y1))
mid_y = (BRIDGE_Y0 + BRIDGE_Y1) / 2
length = math.hypot(BRIDGE_Y0 - BRIDGE_Y1, DECK_Z0 - DECK_Z1)
bridge = Builder("Bridge")
tilt = Matrix.Rotation(SLOPE, 3, "X")    # deck rises toward +Y (descends toward the hall)
bridge.box((0, mid_y, deck_z(mid_y)), (6.2, length, 0.16), M["walkway"], rot=tilt)                    # walkway
for s in (-1, 1):
    bridge.box((s * 3.55, mid_y, deck_z(mid_y)), (0.9, length, 0.06), M["deck"], rot=tilt)               # glass margins
for s in (-1, 1):
    bridge.box((s * 4.15, mid_y, deck_z(mid_y) - 0.35), (0.35, length, 0.8), M["white_metal"], rot=tilt)      # edge girders
    bridge.box((s * 3.95, mid_y, deck_z(mid_y) + 1.05), (0.06, length, 0.06), M["steel"], rot=tilt)            # handrail
    bridge.box((s * 3.95, mid_y, deck_z(mid_y) + 0.45), (0.03, length, 0.03), M["steel"], rot=tilt)            # mid rail
    bridge.box((s * 3.9, mid_y, deck_z(mid_y) + 0.08), (0.05, length, 0.03), M["cyan_soft"], rot=tilt)         # kick light
y = BRIDGE_Y0 - 1.0
while y > BRIDGE_Y1 + 1.0:
    for s in (-1, 1):
        bridge.box((s * 3.95, y, deck_z(y) + 0.55), (0.06, 0.06, 1.0), M["steel"])                            # posts
    y -= 3.0
y = BRIDGE_Y0 - 3.0
while y > BRIDGE_Y1 + 3.0:
    bridge.box((0, y, deck_z(y) - 0.42), (7.6, 0.14, 0.4), M["white_metal"])                                   # cross beams
    y -= 7.0
y = BRIDGE_Y0 - 6.0
while y > BRIDGE_Y1 + 8.0:
    top = deck_z(y) - 0.6
    for s in (-1, 1):
        bridge.box((s * 3.2, y, top / 2), (0.9, 0.9, top), M["white_metal"])                                    # pylons
        bridge.box((s * 3.2, y, 0.25), (1.8, 1.8, 0.5), M["concrete"])                                          # footings
    if top > 4:
        bridge.box((0, y, top - 1.2), (6.4, 0.5, 0.6), M["white_metal"])                                       # pylon cap beam
    y -= 14.0
instance(bridge.mesh(), "Git sky-bridge", bevel=0.015)


# Launch platform: a floating disc under the display exit where the artifact lands (cf. the floating-lab reference).
plat = Builder("Launch platform")
PLAT_Y, PLAT_TOP = 21.0, DECK_Z0
plat.cyl((0, 0, -0.35), 7.0, 0.7, M["walkway"], segments=64)
plat.cyl((0, 0, -0.74), 7.15, 0.08, M["cyan"], segments=64)
plat.cyl((0, 0, -4.2), 1.4, 6.8, M["white_metal"], segments=48, radius2=6.6)   # narrow at the bottom
plat.cyl((0, 0, -0.02), 3.2, 0.04, M["cyan_soft"], segments=48)
plat.cyl((0, 0, 0.0), 3.05, 0.05, M["walkway"], segments=48)
for k in range(12):
    a = 2 * math.pi * k / 12
    plat.box((math.sin(a) * 6.75, math.cos(a) * 6.75, 0.55), (0.06, 0.06, 1.1), M["steel"])
instance(plat.mesh(), "Launch platform", (0, PLAT_Y, PLAT_TOP), bevel=0.02)


def lane(x_fn, y0, y1, steps=48, lift=0.1):
    return [(x_fn(y0 + (y1 - y0) * i / steps), y0 + (y1 - y0) * i / steps, deck_z(y0 + (y1 - y0) * i / steps) + lift) for i in range(steps + 1)]


def feature_x(y):
    if y > -8 or y < -64:
        return 0.0
    if y > -16:
        k = (-8 - y) / 8
        return -2.4 * k * k * (3 - 2 * k)
    if y > -56:
        return -2.4
    k = (y + 56) / -8
    return -2.4 * (1 - k * k * (3 - 2 * k))


tube("Rail main", lane(lambda y: 0.0, BRIDGE_Y0 - 0.5, BRIDGE_Y1 + 0.5), 0.05, M["violet"], shadow=False)
tube("Rail feature", lane(feature_x, -7.5, -64.5, 72), 0.05, M["cyan"], shadow=False)
tube("Rail release", lane(lambda y: 1.8 if y < -74 else 1.8 * max(0.0, (-64 - y) / 10), -64, BRIDGE_Y1 + 0.5, 40), 0.045, M["green"], shadow=False)

# Signboards: glass cards on slim posts beside the deck (readable from the camera path).
def signboard(name, y, x, lines, accent):
    z = deck_z(y) + 2.3
    card_w = 4.6
    box(f"{name} card", (x, y, z), (card_w, 0.06, 1.4), M["display"], bevel=0.03, shadow=False)
    box(f"{name} edge", (x, y + 0.04, z + 0.67), (card_w, 0.01, 0.06), accent, shadow=False)
    box(f"{name} post", (x, y - 0.1, (deck_z(y) + z - 0.55) / 2), (0.06, 0.06, z - 0.55 - deck_z(y)), M["steel"])
    box(f"{name} bracket", ((x + math.copysign(4.15, x)) / 2, y - 0.1, deck_z(y) + 0.05), (abs(x) - 4.15, 0.08, 0.08), M["steel"])
    for i, (body, size, mat) in enumerate(lines):
        text(body, (x + card_w / 2 - 0.22, y + 0.05, z + 0.2 - i * 0.5), size * 1.45, mat)


signboard("main", 6.0, 6.6, [("main", 0.26, M["label"]), ("protected branch", 0.15, M["label"])], M["violet"])
signboard("feature", -14.0, -6.6, [("feature/library-search", 0.2, M["label"]), ("branch from main", 0.15, M["label"])], M["cyan"])
COMMITS = [(-2.4, -26.0, "a3f9c21", "add catalogue search"), (-2.4, -44.0, "7be104d", "test SearchAsync"), (0.0, -64.0, "merge", "into main")]
for cx, cy, sha, msg in COMMITS:
    z = deck_z(cy) + 0.1
    puck = Builder(f"Commit {sha}")
    puck.cyl((0, 0, 0.09), 0.48, 0.18, M["white_metal"], segments=6)
    puck.cyl((0, 0, 0.2), 0.36, 0.06, M["amber"] if sha == "merge" else M["cyan"], segments=6)
    instance(puck.mesh(), f"Commit {sha}", (cx, cy, z), bevel=0.02)
    signboard(f"sha {sha}", cy + 0.5, -6.6 if cx < 0 else 6.6, [(sha, 0.26, M["label"]), (msg, 0.16, M["label"])], M["amber"] if sha == "merge" else M["cyan"])

# Release tag gate: machined arch over the deck.
GATE_Y = -92.0
gz = deck_z(GATE_Y)
gate = Builder("Tag gate")
for s in (-1, 1):
    gate.box((s * 4.8, 0, -gz / 2 + 2.5), (0.7, 0.9, gz + 5.0), M["white_metal"])
    gate.box((s * 4.45, 0.46, 2.4), (0.05, 0.02, 4.4), M["green"])
gate.box((0, 0, 5.2), (10.3, 0.9, 0.8), M["white_metal"])
gate.box((0, 0.46, 4.9), (8.6, 0.02, 0.06), M["green"])
instance(gate.mesh(), "Tag gate", (0, GATE_Y, gz), bevel=0.03)
text("TAG  release/v1.0", (0, GATE_Y + 0.47, gz + 5.05), 0.34, M["label"], align="CENTER")

# ----------------------------------------------------------------------------------------------
# 2. CI hall (Y -124 → -214): steel portal frames, glazed roof, conveyor and four stations.
# ----------------------------------------------------------------------------------------------
HALL_Y0, HALL_Y1, HALL_W, HALL_H = -124.0, -214.0, 30.0, 14.0
BELT_Z = 1.2
hall = Builder("Hall structure")
hall_glass = Builder("Hall glazing")
bay = 6.0
y = HALL_Y0
while y >= HALL_Y1 - 0.01:
    for s in (-1, 1):
        x = s * HALL_W / 2
        hall.box((x, y, HALL_H / 2), (0.7, 0.45, HALL_H), M["white_metal"])                 # columns
        hall.box((x - s * 0.3, y, HALL_H / 2), (0.06, 0.9, HALL_H), M["white_metal"])       # flanges
    hall.box((0, y, HALL_H + 0.4), (HALL_W + 0.8, 0.45, 0.8), M["white_metal"])              # rafter
    for k in range(-6, 7):                                                                    # truss diagonals
        x = k * HALL_W / 13
        hall.box((x, y, HALL_H - 0.5), (0.12, 0.12, 1.6), M["steel"],
                 rot=Matrix.Rotation(math.radians(35 if k % 2 else -35), 3, "Y"))
    y -= bay
for s in (-1, 1):
    # Side walls: solid lower cladding, glazed clerestory with mullions.
    hall.box((s * (HALL_W / 2 + 0.25), (HALL_Y0 + HALL_Y1) / 2, 2.6), (0.3, HALL_Y0 - HALL_Y1, 5.2), M["hall_wall"])
    y = HALL_Y0
    while y > HALL_Y1:
        for zz in (5.2, 9.6, HALL_H):
            hall.box((s * (HALL_W / 2 + 0.2), (HALL_Y0 + HALL_Y1) / 2, zz), (0.16, HALL_Y0 - HALL_Y1, 0.16), M["white_metal"])
        hall.box((s * (HALL_W / 2 + 0.2), y - 1.5, 9.6), (0.12, 0.12, 8.8), M["white_metal"])
        y -= 3.0
    hall_glass.box((s * (HALL_W / 2 + 0.2), (HALL_Y0 + HALL_Y1) / 2, 9.6), (0.04, HALL_Y0 - HALL_Y1, 8.8), M["glass_blue"])
# Glazed sawtooth roof: glass slopes + mullions (glass casts no shadow, mullions do).
y = HALL_Y0
while y > HALL_Y1:
    hall_glass.box((0, y - bay / 2, HALL_H + 1.4), (HALL_W, bay * 1.02, 0.05), M["glass"],
                   rot=Matrix.Rotation(math.radians(14), 3, "X"))
    for k in range(-7, 8):
        hall.box((k * HALL_W / 15, y - bay / 2, HALL_H + 1.4), (0.1, bay * 1.03, 0.14), M["white_metal"],
                 rot=Matrix.Rotation(math.radians(14), 3, "X"))
    y -= bay
# End walls: entrance and exit portals with glazed panels around a large opening.
for ey, label in ((HALL_Y0, "in"), (HALL_Y1, "out")):
    for s in (-1, 1):
        hall.box((s * 10.5, ey, HALL_H / 2), (9.0, 0.3, HALL_H), M["hall_wall"])
    hall.box((0, ey, 11.0), (12.0, 0.3, 6.0), M["hall_wall"])
    hall.box((0, ey + (0.18 if label == "in" else -0.18), 8.1), (12.4, 0.08, 0.2), M["cyan_soft"])
instance(hall.mesh(), "CI hall", bevel=0.012)
instance(hall_glass.mesh(), "CI hall glazing", shadow=False)
box("Hall floor", (0, (HALL_Y0 + HALL_Y1) / 2, -0.02), (HALL_W + 1, HALL_Y0 - HALL_Y1 + 1, 0.06), M["concrete"])
for s in (-1, 1):
    box(f"Floor guide {s}", (s * 2.2, (HALL_Y0 + HALL_Y1) / 2, 0.015), (0.08, HALL_Y0 - HALL_Y1, 0.01), M["cyan_soft"], shadow=False)
text("CONTINUOUS INTEGRATION", (0, HALL_Y0 + 0.2, 10.4), 1.05, M["label"], font=FONT_SANS, align="CENTER")

# Conveyor through the hall, continuing out to the deployment guideway.
conv = Builder("Conveyor")
conv.box((0, (HALL_Y0 + HALL_Y1) / 2, BELT_Z - 0.18), (1.9, HALL_Y0 - HALL_Y1 + 2, 0.24), M["gunmetal"])
conv.box((0, (HALL_Y0 + HALL_Y1) / 2, BELT_Z - 0.04), (1.4, HALL_Y0 - HALL_Y1 + 2, 0.05), M["rubber"])
for s in (-1, 1):
    conv.box((s * 0.98, (HALL_Y0 + HALL_Y1) / 2, BELT_Z + 0.05), (0.06, HALL_Y0 - HALL_Y1 + 2, 0.2), M["steel"])
    conv.box((s * 0.93, (HALL_Y0 + HALL_Y1) / 2, BELT_Z + 0.16), (0.03, HALL_Y0 - HALL_Y1 + 2, 0.02), M["cyan"])
    y = HALL_Y0 - 1
    while y > HALL_Y1:
        conv.box((s * 0.8, y, (BELT_Z - 0.3) / 2), (0.1, 0.1, BELT_Z - 0.3), M["steel"])
        y -= 2.0
instance(conv.mesh(), "Conveyor", bevel=0.006)

STATIONS = [(-138.0, "RESTORE", "dotnet restore", CYAN, M["cyan"]),
            (-158.0, "BUILD", "dotnet build -c Release", AMBER, M["amber"]),
            (-178.0, "TEST", "dotnet test", GREEN, M["green"]),
            (-198.0, "PACKAGE", "dotnet publish -c Release", VIOLET, M["violet"])]


def gantry_sign(y, name, cmd, accent):
    g = Builder(f"{name} gantry")
    for s in (-1, 1):
        g.box((s * 6.0, 0, 3.4), (0.35, 0.35, 6.8), M["white_metal"])
    g.box((0, 0, 6.6), (12.4, 0.5, 0.5), M["white_metal"])
    g.box((0, 0.1, 5.65), (6.2, 0.4, 1.5), M["dark"])
    g.box((0, 0.31, 5.0), (6.0, 0.02, 0.06), accent)
    instance(g.mesh(), f"{name} gantry", (0, y, 0), bevel=0.02)
    text(name, (0, y + 0.32, 5.75), 0.52, M["label"], font=FONT_SANS, align="CENTER")
    text(cmd, (0, y + 0.32, 5.2), 0.2, M["label"], align="CENTER")


for sy, name, cmd, col, acc in STATIONS:
    gantry_sign(sy + 7.0, name, cmd, acc)
    area_light(f"{name} wash", (0, sy, 6.0), 4.0, 260, col, size_y=3.0)

# RESTORE: automated storage racks with labelled package crates and a gantry picker.
store = Builder("Package store")
for s in (-1, 1):
    x = s * 5.2
    for lvl in range(5):
        store.box((x, 0, 0.6 + lvl * 1.3), (2.2, 10.0, 0.08), M["steel"])
        for k in range(8):
            if random.random() < 0.82:
                cy_ = -4.4 + k * 1.25
                store.box((x, cy_, 0.6 + lvl * 1.3 + 0.42), (1.6, 1.0, 0.76), M["crate_box"])
                store.box((x - s * 0.81, cy_, 0.6 + lvl * 1.3 + 0.5), (0.01, 0.5, 0.14), M["cyan_soft"])
    for k in range(5):
        store.box((x, -5 + k * 2.5, 3.3), (0.08, 0.08, 6.6), M["white_metal"])
store.box((0, 0, 7.6), (12.0, 0.3, 0.3), M["white_metal"])
store.box((-1.5, 0, 6.8), (0.5, 0.5, 1.4), M["robot"])
store.box((-1.5, 0, 5.8), (0.12, 0.12, 0.8), M["steel"])
instance(store.mesh(), "Restore store", (0, -138.0, 0), bevel=0.01)

# BUILD: twin compiler machines either side of the belt, amber heat slits, overhead heater bar, coolant pipes.
comp = Builder("Compiler")
for s in (-1, 1):
    comp.box((s * 2.7, 0, 2.6), (2.0, 6.0, 5.2), M["dark"])
    comp.box((s * 2.7, 0, 5.35), (2.3, 6.3, 0.3), M["white_metal"])
    for k in range(6):
        comp.box((s * 1.69, 0, 1.0 + k * 0.62), (0.03, 5.2, 0.07), M["amber_soft"])           # heat slits
    for k in range(18):
        comp.box((s * 3.78, -2.8 + k * 0.33, 2.6), (0.16, 0.05, 4.0), M["gunmetal"])          # heat-sink fins
    for k in range(3):
        comp.cyl((s * 4.05, 0, 1.0 + k * 1.2), 0.16, 7.0, M["steel"], axis="Y", segments=20)
    comp.box((s * 2.7, 3.02, 2.6), (1.6, 0.04, 0.14), M["hazard"])
comp.box((0, 0, 5.6), (7.6, 0.6, 0.35), M["white_metal"])                                     # heater bridge
comp.box((0, 0, 5.38), (3.0, 0.4, 0.06), M["amber"])
point_light("Compiler core", (0, -158.0, 2.6), 900, AMBER, 0.6)
for k, ry in enumerate((-155.2, -158.0, -160.8)):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.95, minor_radius=0.06 if k != 1 else 0.09, location=(0, ry, BELT_Z + 0.42),
                                     rotation=(math.pi / 2, 0, 0), major_segments=64, minor_segments=10)
    ring_o = bpy.context.active_object
    ring_o.name = f"Compile ring {k}"
    ring_o.data.materials.append(M["amber"])
    ring_o.visible_shadow = False


def robot_arm(name, base, yaw, reach=1.0):
    arm = Builder(name)
    arm.cyl((0, 0, 0.14), 0.42, 0.28, M["gunmetal"], segments=32)
    arm.cyl((0, 0, 0.42), 0.34, 0.28, M["robot"], segments=32)
    arm.box((0, 0, 0.78), (0.42, 0.46, 0.5), M["robot"])
    arm.cyl((0, 0, 1.0), 0.22, 0.62, M["gunmetal"], axis="X", segments=24)
    arm.box((0.3, 0, 1.55), (0.26, 0.3, 1.2), M["robot"], rot=Matrix.Rotation(math.radians(-22), 3, "Y"))
    arm.cyl((0.55, 0, 2.1), 0.17, 0.5, M["gunmetal"], axis="X", segments=24)
    arm.box((0.55 + 0.55 * reach, 0, 2.02), (1.1 * reach, 0.24, 0.24), M["robot"], rot=Matrix.Rotation(math.radians(8), 3, "Y"))
    arm.cyl((0.55 + 1.1 * reach, 0, 1.92), 0.12, 0.34, M["gunmetal"], axis="X", segments=20)
    arm.box((0.62 + 1.1 * reach, 0, 1.7), (0.14, 0.16, 0.3), M["steel"])
    for s in (-1, 1):
        arm.box((0.62 + 1.1 * reach, s * 0.07, 1.5), (0.05, 0.03, 0.18), M["steel"])
    arm.box((0.55 + 0.55 * reach, 0.13, 2.02), (0.8 * reach, 0.01, 0.05), M["amber_soft"])
    return instance(arm.mesh(), name, base, rot=(0, 0, yaw), bevel=0.012)


# TEST: two arms over the belt, a scan arch and a results wall.
robot_arm("Test arm L", (-2.3, -177.0, 0), 0.0, reach=1.1)
robot_arm("Test arm R", (2.3, -179.5, 0), math.pi, reach=1.1)
scan = Builder("Scan arch")
for s in (-1, 1):
    scan.box((s * 1.6, 0, 2.1), (0.25, 0.4, 4.2), M["white_metal"])
scan.box((0, 0, 4.2), (3.45, 0.4, 0.25), M["white_metal"])
scan.box((0, 0.21, 4.05), (2.9, 0.02, 0.04), M["green"])
for s in (-1, 1):
    scan.box((s * 1.45, 0.21, 2.1), (0.04, 0.02, 3.8), M["green"])
instance(scan.mesh(), "Scan arch", (0, -176.0, 0), bevel=0.01)
board = Builder("Results wall")
board.box((0, 0, 3.0), (0.2, 7.0, 3.6), M["dark"])
for r in range(7):
    for c in range(16):
        board.box((0.11, -3.0 + c * 0.4, 1.6 + r * 0.42), (0.02, 0.2, 0.2), M["green"])
instance(board.mesh(), "Results wall", (-8.5, -178.0, 0))
text("BooksControllerTests  ·  passed", (-8.38, -181.0, 5.15), 0.2, M["label"],
     rot=(math.pi / 2, 0, math.pi / 2))

# PACKAGE: press frame that encloses the artifact in its release crate.
press = Builder("Package press")
for s in (-1, 1):
    for t_ in (-1, 1):
        press.box((s * 1.7, t_ * 1.4, 2.5), (0.3, 0.3, 5.0), M["white_metal"])
press.box((0, 0, 5.1), (3.8, 3.2, 0.4), M["white_metal"])
press.box((0, 0, 4.2), (1.6, 1.6, 0.6), M["steel"])
for s in (-1, 1):
    press.cyl((s * 0.5, 0, 4.7), 0.1, 0.6, M["steel"])
    press.box((s * 1.7, 1.56, 2.5), (0.02, 0.02, 4.4), M["violet"])
instance(press.mesh(), "Package press", (0, -198.0, 0), bevel=0.015)

# Interior atmosphere: thin volume so the low sun through the exit and roof makes light shafts.
vol_mat = bpy.data.materials.new("Hall air")
vol_mat.use_nodes = True
vnt = vol_mat.node_tree
vnt.nodes.remove(vnt.nodes["Principled BSDF"])
pv = vnt.nodes.new("ShaderNodeVolumePrincipled")
pv.inputs["Density"].default_value = 0.012
pv.inputs["Anisotropy"].default_value = 0.55
vnt.links.new(pv.outputs[0], vnt.nodes["Material Output"].inputs["Volume"])
box("Hall air", (0, (HALL_Y0 + HALL_Y1) / 2, HALL_H / 2), (HALL_W, HALL_Y0 - HALL_Y1, HALL_H), vol_mat, shadow=False)

# ----------------------------------------------------------------------------------------------
# 3. Deployment field (Y -214 → -372): guideway road between server buildings to the gateway ring.
# ----------------------------------------------------------------------------------------------
ROAD_Y0, ROAD_Y1 = -214.0, -400.0
box("Road", (0, (ROAD_Y0 + ROAD_Y1) / 2, 0.01), (16.0, ROAD_Y0 - ROAD_Y1, 0.04), M["asphalt"])
road = Builder("Road furniture")
for s in (-1, 1):
    road.box((s * 7.6, (ROAD_Y0 + ROAD_Y1) / 2, 0.05), (0.12, ROAD_Y0 - ROAD_Y1, 0.02), M["cyan_soft"])
    y = ROAD_Y0 - 2
    while y > ROAD_Y1:
        road.box((s * 5.2, y, 0.04), (0.18, 2.4, 0.01), M["white_led"])
        road.cyl((s * 8.6, y, 0.45), 0.08, 0.9, M["steel"], segments=10)
        road.box((s * 8.6, y, 0.95), (0.14, 0.14, 0.12), M["amber_soft"])
        y -= 8.0
# Raised glass guideway carrying the artifact (continues the conveyor).
road.box((0, (ROAD_Y0 + ROAD_Y1) / 2, BELT_Z - 0.2), (1.6, ROAD_Y0 - ROAD_Y1, 0.18), M["asphalt"])
for s in (-1, 1):
    road.box((s * 0.82, (ROAD_Y0 + ROAD_Y1) / 2, BELT_Z - 0.02), (0.04, ROAD_Y0 - ROAD_Y1, 0.05), M["cyan"])
y = ROAD_Y0 - 1
while y > ROAD_Y1:
    road.box((0, y, (BELT_Z - 0.3) / 2), (0.3, 0.3, BELT_Z - 0.3), M["white_metal"])
    y -= 6.0
instance(road.mesh(), "Road furniture", shadow=True)


def server_building(variant):
    """Data-centre block: cladding, vertical fins, light band, loading doors, rooftop chillers, cable tray.
    Facade facing the road at local x = 0 (body extends toward +x)."""
    rnd = random.Random(300 + variant)
    W, D, H = 18.0, 14.0, 9.0 + variant * 1.5
    b = Builder(f"Server building {variant}")
    b.box((D / 2, 0, H / 2), (D, W, H), M["facade"] if variant != 1 else M["facade_light"])
    b.box((D / 2, 0, H + 0.4), (D + 0.3, W + 0.3, 0.8), M["white_metal"])                       # parapet
    for k in range(int(W / 0.6)):                                                              # facade fins
        y_ = -W / 2 + 0.3 + k * 0.6
        b.box((-0.18, y_, H * 0.55), (0.36, 0.06, H * 0.7), M["gunmetal"])
    b.box((-0.05, 0, H * 0.2), (0.06, W, 0.18), M["cyan"])                                       # light band
    b.box((-0.05, 0, H * 0.9), (0.06, W, 0.08), M["cyan_soft"])
    for k in (-1, 1):                                                                           # loading doors
        b.box((-0.04, k * 4.5, 1.6), (0.08, 3.2, 3.2), M["dark"])
        b.box((-0.07, k * 4.5, 3.3), (0.04, 3.2, 0.08), M["amber_soft"])
    for k in range(3):                                                                          # rooftop chillers
        cx = 3.5 + k * 3.6
        b.box((cx, 0, H + 1.6), (3.0, 7.0, 1.6), M["white_metal"])
        for f in (-1, 1):
            b.cyl((cx, f * 1.7, H + 2.45), 1.15, 0.12, M["dark"], segments=24)
            b.cyl((cx, f * 1.7, H + 2.5), 0.25, 0.08, M["steel"], segments=12)
    b.box((D * 0.5, W / 2 + 0.4, H * 0.75), (D * 0.8, 0.8, 0.4), M["steel"])                    # cable tray
    for e in (-1, 1):                                                                           # lit gable ends
        b.box((D / 2, e * (W / 2 + 0.03), H * 0.2), (D, 0.06, 0.16), M["cyan_soft"])
        for k in range(int(D / 0.7)):
            b.box((0.35 + k * 0.7, e * (W / 2 + 0.12), H * 0.55), (0.08, 0.24, H * 0.6), M["gunmetal"])
    for k in range(rnd.randint(3, 5)):                                                          # vents on the side
        b.box((D * (0.2 + 0.15 * k), -W / 2 - 0.05, H * 0.6), (1.2, 0.1, 1.2), M["gunmetal"])
    return b.mesh()


BUILDINGS = [server_building(v) for v in range(3)]
rng = random.Random(42)
for s in (-1, 1):
    for row, x0 in enumerate((10.5, 32.0, 54.0)):
        y = ROAD_Y0 - 16.0 - row * 6.0
        while y > -350.0:
            mesh = BUILDINGS[rng.randrange(len(BUILDINGS))]
            instance(mesh, f"Server {s} {row} {y:.0f}", (s * x0, y, 0), rot=(0, 0, 0 if s > 0 else math.pi), bevel=0.01 if row == 0 else 0.0)
            y -= 22.0 + row * 2.0

# Deployment gateway: segmented ring with armour plates, inner light ring, amber chevrons, footings.
RING_Y, RING_Z, RING_R = -372.0, 20.0, 19.0
ring = Builder("Gateway")
N_PLATES = 32
for k in range(N_PLATES):
    a = 2 * math.pi * k / N_PLATES
    rot = Matrix.Rotation(-a, 3, "Y")
    pos = Vector((math.sin(a) * RING_R, 0, math.cos(a) * RING_R))
    ring.box(tuple(pos), (2 * math.pi * RING_R / N_PLATES * 0.985, 3.6, 1.5), M["white_metal"] if k % 2 else M["gunmetal"], rot=rot)
    inner = Vector((math.sin(a) * (RING_R - 1.55), 0, math.cos(a) * (RING_R - 1.55)))
    ring.box(tuple(inner), (2 * math.pi * RING_R / N_PLATES * 0.7, 3.2, 0.3), M["dark"], rot=rot)
    seam = Vector((math.sin(a + math.pi / N_PLATES) * RING_R, 2.02, math.cos(a + math.pi / N_PLATES) * RING_R))
    ring.box(tuple(seam), (0.08, 0.04, 2.4), M["cyan_soft"], rot=Matrix.Rotation(-(a + math.pi / N_PLATES), 3, "Y"))
for k in range(8):
    a = 2 * math.pi * k / 8 + math.pi / 8
    pos = Vector((math.sin(a) * (RING_R + 2.0), 2.1, math.cos(a) * (RING_R + 2.0)))
    ring.cyl(tuple(pos), 1.1, 0.4, M["amber"], axis="Y", segments=3, rot=Matrix.Rotation(-a, 3, "Y"))
for s in (-1, 1):
    ring.box((s * (RING_R * 0.62), 0, -RING_Z + 4.0), (6.0, 6.0, 8.0), M["concrete"])
instance(ring.mesh(), "Gateway ring", (0, RING_Y, RING_Z), bevel=0.04)
bpy.ops.mesh.primitive_torus_add(major_radius=RING_R - 2.2, minor_radius=0.32, location=(0, RING_Y + 1.0, RING_Z),
                                 rotation=(math.pi / 2, 0, 0), major_segments=128, minor_segments=12)
inner_ring = bpy.context.active_object
bpy.ops.mesh.primitive_torus_add(major_radius=RING_R, minor_radius=1.25, location=(0, RING_Y, RING_Z),
                                 rotation=(math.pi / 2, 0, 0), major_segments=128, minor_segments=16)
ring_core = bpy.context.active_object
ring_core.name = "Gateway core"
ring_core.data.materials.append(M["dark"])
inner_ring.name = "Gateway light"
inner_ring.data.materials.append(M["cyan"])
inner_ring.visible_shadow = False
text("PRODUCTION", (0, RING_Y + 2.15, RING_Z + RING_R + 1.4), 1.2, M["label"], font=FONT_SANS, align="CENTER")

# ----------------------------------------------------------------------------------------------
# Artifact (the followed object) and camera paths
# ----------------------------------------------------------------------------------------------
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


def keyed(keys, f):
    frames = [k[0] for k in keys]
    for i in range(len(frames) - 1):
        if frames[i] <= f <= frames[i + 1]:
            local = (f - frames[i]) / max(1, frames[i + 1] - frames[i])
            # Uniform in key index so each segment keeps its authored timing.
            return catmull([k[1] for k in keys], (i + local) / (len(keys) - 1))
    return Vector(keys[-1][1])


def on_deck(x, y, lift=0.55):
    return (x, y, deck_z(y) + lift)


# Story beats (frame -> artifact position). Frames 0–36: display crossing (artifact hidden; the live DOM
# packet carries the role). 36–46: hand-off. Then Git (56–128) → CI (128–181) → deployment (181–287).
def ss(a, b, x):
    k = min(1.0, max(0.0, (x - a) / (b - a)))
    return k * k * (3 - 2 * k)


CROSS_START = 50.5 if VARIANT == "mobile" else 46.5   # portrait: a step back so the followed call fits the width
CROSS_END = 26.0
VISTA_TARGET = Vector((0.0, -170.0, 6.0))


def cross_cam(f):
    """Crossing: straight push through the display layers, rising slightly as the light breaks (f <= 36)."""
    k = min(1.0, f / 36)
    y = CROSS_START - (CROSS_START - CROSS_END) * (k * k * (3 - 2 * k) * 0.35 + k * 0.65)
    return Vector((0.0, y, DZ + 0.6 * k * k))


def cross_target(f):
    # From a level look at the followed call to the vista direction, so nothing jumps at the break-out.
    level = Vector((0.0, Y_CODE - 30.0, DZ))
    return level.lerp(VISTA_TARGET, ss(0, 36, f))


def ahead_of_camera(f, dist=5.5, drop=0.7):
    c = cross_cam(f)
    return c + (cross_target(f) - c).normalized() * dist + Vector((0, 0, -drop))


# While hidden (crossing), the artifact rides a fixed distance ahead of the camera, so the live DOM packet always
# travels toward a point on screen; it is then kept in view through the vista until it lands on the bridge.
PACKET_KEYS = [(f, tuple(ahead_of_camera(f))) for f in (0, 12, 24, 30, 36)] + [
    (40, (0.0, 19.0, 25.6)), (46, (0.0, 15.0, 24.8)), (52, (0.0, 10.5, 22.6)), (56, on_deck(0.0, 6.0)), (64, on_deck(0.0, -4.0)), (72, on_deck(-2.4, -15.0)),
    (80, on_deck(-2.4, -26.0)), (90, on_deck(-2.4, -44.0)), (100, on_deck(0.0, -64.0)), (108, on_deck(0.0, -78.0)),
    (114, on_deck(0.0, GATE_Y)), (122, on_deck(0.0, -108.0)), (128, (0.0, HALL_Y0, BELT_Z + 0.42)),
    (136, (0.0, -138.0, BELT_Z + 0.42)), (148, (0.0, -158.0, BELT_Z + 0.42)), (160, (0.0, -178.0, BELT_Z + 0.42)),
    (171, (0.0, -198.0, BELT_Z + 0.42)), (181, (0.0, HALL_Y1, BELT_Z + 0.42)), (196, (0.0, -232.0, BELT_Z + 0.42)),
    (214, (0.0, -254.0, BELT_Z + 0.42)), (234, (0.0, -278.0, BELT_Z + 0.42)), (254, (0.0, -300.0, BELT_Z + 0.42)),
    (272, (0.0, -318.0, BELT_Z + 0.42)), (287, (0.0, -332.0, BELT_Z + 0.42)),
]


def seg(f, values, edges):
    """Piecewise value per segment, blended smoothly across each edge (no camera jumps)."""
    v = values[0]
    for (a, b), nxt in zip(edges, values[1:]):
        v = v + (nxt - v) * ss(a, b, f)
    return v


SEG_EDGES = ((120, 130), (178, 192))


def lateral(f):
    """Side-to-side drift for parallax: wide on the bridge, tight in the hall (machines), medium on the road."""
    if f < 40:
        return 0.0
    amp = seg(f, (1.3, 0.4, 1.0), SEG_EDGES) * ss(40, 60, f)
    return amp * math.sin((f - 40) * 0.045)


def cam_offset(f):
    # (behind, above) relative to the artifact; blended between segments.
    behind = seg(f, (7.5, 6.2, 7.5), SEG_EDGES) + 3.0 * ss(192, 250, f)
    above = seg(f, (2.4, 1.7, 1.9), SEG_EDGES)
    return behind, above


def camera_at(f):
    if f <= 36:
        return cross_cam(f)
    p = keyed(PACKET_KEYS, f)
    back, up = cam_offset(f)
    follow = Vector((p.x * 0.55 + lateral(f), p.y + back, p.z + up))
    if f < 58:
        # Emergence: hold high for the vista (continuous with the crossing), then descend behind the artifact.
        k = (f - 36) / 22
        vista = Vector((0.0, CROSS_END - 12.0 * k, DZ + 0.6 + 0.8 * k))
        return vista.lerp(follow, ss(0, 1, k))
    return follow


def target_at(f):
    if f <= 36:
        return cross_target(f)
    ahead = keyed(PACKET_KEYS, min(N_FRAMES - 1, f + 10))
    p = keyed(PACKET_KEYS, f)
    follow = p.lerp(ahead, 0.4) + Vector((0, 0, 0.35))
    if f < 58:
        return VISTA_TARGET.lerp(follow, ss(36, 58, f))
    if f > 250:
        # Final shot: lift the view toward the gateway as the artifact approaches it.
        k = (f - 250) / 37
        e = k * k * (3 - 2 * k)
        return follow.lerp(Vector((0.0, RING_Y, RING_Z * 0.55)), 0.55 * e)
    return follow


# The artifact: an amber octahedron (same silhouette and colour as the live DOM diamond).
PACKET_R = 0.16
pm = bpy.data.meshes.new("Artifact")
bm = bmesh.new()
pv_ = [bm.verts.new(v) for v in ((PACKET_R, 0, 0), (-PACKET_R, 0, 0), (0, PACKET_R, 0), (0, -PACKET_R, 0), (0, 0, PACKET_R * 1.2), (0, 0, -PACKET_R * 1.2))]
for a, b_, c in ((0, 2, 4), (2, 1, 4), (1, 3, 4), (3, 0, 4), (2, 0, 5), (1, 2, 5), (3, 1, 5), (0, 3, 5)):
    bm.faces.new((pv_[a], pv_[b_], pv_[c]))
bm.to_mesh(pm)
bm.free()
packet = link(bpy.data.objects.new("Artifact", pm))
packet.data.materials.append(M["packet"])
packet.visible_shadow = False
packet_light = point_light("Artifact light", (0, 0, 0), 60, AMBER, 0.05)
packet_light.parent = packet
crate = box("Release crate", (0, 0, 0), (0.82, 0.82, 0.82), M["glass_blue"], bevel=0.04, shadow=False)
crate.parent = packet
crate_edges = Builder("Crate frame")
for sx in (-1, 1):
    for sz in (-1, 1):
        crate_edges.box((sx * 0.41, 0, sz * 0.41), (0.035, 0.84, 0.035), M["violet"])
        crate_edges.box((sx * 0.41, sz * 0.41, 0), (0.035, 0.035, 0.84), M["violet"])
        crate_edges.box((0, sx * 0.41, sz * 0.41), (0.84, 0.035, 0.035), M["violet"])
crate_frame = instance(crate_edges.mesh(), "Release crate frame", shadow=False)
crate_frame.parent = packet

target = link(bpy.data.objects.new("Camera target", None))
cam_data = bpy.data.cameras.new("Camera")
if VARIANT == "mobile":
    cam_data.sensor_fit = "VERTICAL"
    cam_data.lens = 17
    cam_data.shift_y = -0.20   # artifact in the upper ~40%; the lower band is reserved for chapter text
else:
    cam_data.sensor_fit = "HORIZONTAL"
    cam_data.lens = 26
cam_data.clip_start = 0.05
cam_data.clip_end = 3000
cam_data.dof.use_dof = True
cam_data.dof.focus_object = packet
cam_data.dof.aperture_fstop = 5.6
camera = link(bpy.data.objects.new("Camera", cam_data))
scene.camera = camera
track = camera.constraints.new("TRACK_TO")
track.target = target
track.track_axis = "TRACK_NEGATIVE_Z"
track.up_axis = "UP_Y"

HANDOFF = (34, 44)     # t 1.72–1.80: the live DOM packet fades onto the rendered artifact
CRATE_FROM = 168       # package station
fade_socks = [m.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"] for m in list(CODE_MATS.values()) + [M["token_glow"]]]
fade_base = [s.default_value for s in fade_socks]
bg_alpha = M["code_bg"].node_tree.nodes["Principled BSDF"].inputs["Alpha"]
try_set(M["code_bg"], "surface_render_method", "BLENDED")
backlight_strength = M["backlight"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]

for f in range(N_FRAMES):
    p = keyed(PACKET_KEYS, f)
    packet.location = p
    packet.rotation_euler = (0.0, 0.0, f * 0.07)
    s = 0.001 if f < HANDOFF[0] else min(1.0, (f - HANDOFF[0]) / (HANDOFF[1] - HANDOFF[0]))
    packet.scale = (s, s, s)
    for prop in ("location", "rotation_euler", "scale"):
        packet.keyframe_insert(prop, frame=f)
    packet_light.data.energy = 60.0 * s
    packet_light.data.keyframe_insert("energy", frame=f)
    c = 0.001 if f < CRATE_FROM else min(1.0, (f - CRATE_FROM) / 6)
    for o in (crate, crate_frame):
        o.scale = (c, c, c)
        o.keyframe_insert("scale", frame=f)
    camera.location = camera_at(f)
    camera.keyframe_insert("location", frame=f)
    target.location = target_at(f)
    target.keyframe_insert("location", frame=f)
    # Code glyphs and the editor surface dissolve as the camera reaches them (mirrors the DOM fade).
    fade = 1.0 - min(1.0, max(0.0, (f - 5) / 7))
    for sock, base in zip(fade_socks, fade_base):
        sock.default_value = base * fade
        sock.keyframe_insert("default_value", frame=f)
    bg_alpha.default_value = fade
    bg_alpha.keyframe_insert("default_value", frame=f)
    # Backlight swells as the camera approaches (the light we break out into), then is behind us.
    backlight_strength.default_value = 0.5 + 16.0 * max(0.0, 1.0 - abs(f - 28.5) / 2.5)
    # No depth of field inside the display (it only added noise there); cinematic focus once outside.
    cam_data.dof.aperture_fstop = 128.0 if f < 34 else 5.6
    cam_data.dof.keyframe_insert("aperture_fstop", frame=f)
    backlight_strength.keyframe_insert("default_value", frame=f)

for o in code_objs + [token_box, code_bg]:
    o.hide_render = False
    o.keyframe_insert("hide_render", frame=12)
    o.hide_render = True
    o.keyframe_insert("hide_render", frame=13)

anim_owners = [packet, camera, target, crate, crate_frame] + list(CODE_MATS.values()) + [M["token_glow"], M["code_bg"], M["backlight"]]
for owner in anim_owners:
    ad = owner.animation_data if hasattr(owner, "animation_data") else None
    if owner in anim_owners[5:]:
        ad = owner.node_tree.animation_data
    if not ad or not ad.action:
        continue
    action = ad.action
    curves = getattr(action, "fcurves", None)
    if curves is None:   # Blender 4.4+ layered actions
        curves = [fc for layer in action.layers for strip in layer.strips for bag in strip.channelbags for fc in bag.fcurves]
    for fc in curves:
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR"

# ----------------------------------------------------------------------------------------------
# Compositor: aerial perspective from the mist pass + restrained bloom.
# ----------------------------------------------------------------------------------------------
scene.use_nodes = True
tree = scene.node_tree
try:
    for n in list(tree.nodes):
        tree.nodes.remove(n)
    rl = tree.nodes.new("CompositorNodeRLayers")
    comp_out = tree.nodes.new("CompositorNodeComposite")
    haze = tree.nodes.new("CompositorNodeMixRGB")
    haze.blend_type = "MIX"
    haze.inputs[2].default_value = (0.86, 0.60, 0.42, 1)
    mist_amt = tree.nodes.new("CompositorNodeMath")
    mist_amt.operation = "MULTIPLY"
    mist_amt.inputs[1].default_value = 0.26
    tree.links.new(rl.outputs["Mist"], mist_amt.inputs[0])
    tree.links.new(mist_amt.outputs[0], haze.inputs[0])
    tree.links.new(rl.outputs["Image"], haze.inputs[1])
    glare = tree.nodes.new("CompositorNodeGlare")
    for kind in ("BLOOM", "FOG_GLOW"):
        try:
            glare.glare_type = kind
            break
        except TypeError:
            continue
    for attr, value in (("quality", "HIGH"), ("mix", -0.7), ("threshold", 2.2), ("size", 7)):
        try_set(glare, attr, value)
    for name, value in (("Strength", 0.3), ("Threshold", 2.2), ("Highlights Threshold", 2.2)):
        sock = glare.inputs.get(name) if hasattr(glare.inputs, "get") else None
        if sock is not None and isinstance(getattr(sock, "default_value", None), float):
            sock.default_value = value
    tree.links.new(haze.outputs[0], glare.inputs[0])
    tree.links.new(glare.outputs[0], comp_out.inputs[0])
except Exception as exc:   # compositor API differences must never block a render
    print("Compositor fallback:", exc)
    try:
        tree.links.new(rl.outputs["Image"], comp_out.inputs[0])
    except Exception:
        pass

# ----------------------------------------------------------------------------------------------
# Output
# ----------------------------------------------------------------------------------------------
def export_packet():
    out_dir = os.path.join(ROOT, "public", "cinematic", "pipeline", VARIANT)
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for f in range(N_FRAMES):
        scene.frame_set(f)
        bpy.context.view_layer.update()
        pos = packet.matrix_world.translation.copy()
        co = world_to_camera_view(scene, camera, pos)
        visible = 1 if (0 <= co.x <= 1 and 0 <= co.y <= 1 and co.z > 0) else 0
        cam_right = camera.matrix_world.to_3x3() @ Vector((1, 0, 0))
        edge = world_to_camera_view(scene, camera, pos + cam_right * PACKET_R)
        radius = abs(edge.x - co.x) * scene.render.resolution_x / scene.render.resolution_y
        rows.append([round(co.x, 4), round(1 - co.y, 4), round(co.z, 3), visible, round(radius, 5)])
    meta = {"frames": N_FRAMES, "tStart": T_START, "tEnd": T_END,
            "width": scene.render.resolution_x, "height": scene.render.resolution_y, "packet": rows,
            "handoff": list(HANDOFF),
            "beats": {"crossing": [0, 36], "git": [46, 128], "ci": [128, 181], "deploy": [181, N_FRAMES - 1]},
            "generator": "blender/scripts/pipeline_scene.py (v3 luminous facility)", "blender": bpy.app.version_string}
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
