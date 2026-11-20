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
import time
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

GENERATOR = "blender/scripts/pipeline_scene.py (v4 engineering district)"
N_FRAMES = 288                 # frames 0..287

# Look development for the interior facility (v4). One place to tune exposure and light levels.
EXPOSURE = 0.15
HDRI_STRENGTH = 0.2
SUN_STRENGTH = 5.0
SKY_POWER = 2600.0
GALLERY_POWER = 1800.0
AISLE_POWER = 1800.0
ATRIUM_HAZE = 0.0045
HAZE_MIX = 0.3
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
scene.view_settings.exposure = EXPOSURE

# Benchmark option (--engine cycles --device optix|cuda|cpu): GPU path tracing on the RTX 3050 instead of Eevee.
# Set only for this process (factory startup); nothing is saved to the user's Blender preferences.
ENGINE = arg("engine", "eevee")
DEVICE = arg("device", "optix")
if ENGINE == "cycles":
    scene.render.engine = "CYCLES"
    try:
        cprefs = bpy.context.preferences.addons["cycles"].preferences
        cprefs.compute_device_type = "NONE" if DEVICE == "cpu" else DEVICE.upper()
        cprefs.get_devices()
        for dev in cprefs.devices:
            dev.use = (DEVICE == "cpu" and dev.type == "CPU") or (DEVICE != "cpu" and dev.type == DEVICE.upper())
        print("Cycles devices:", [(dev.name, dev.type, dev.use) for dev in cprefs.devices])
    except Exception as exc:   # report and fall back to CPU rather than fail silently
        print("Cycles device setup failed:", exc)
    scene.cycles.device = "CPU" if DEVICE == "cpu" else "GPU"
    scene.cycles.samples = SAMPLES
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = "OPTIX" if DEVICE == "optix" else "OPENIMAGEDENOISE"
    except TypeError:
        pass
    scene.cycles.max_bounces, scene.cycles.volume_bounces = 6, 1
bpy.context.view_layer.use_pass_mist = True

# ----------------------------------------------------------------------------------------------
# World: a Poly Haven HDRI (CC0) lights reflections and ambience; camera rays see a deep neutral void,
# because every chapter of this sequence now happens inside the facility.
# ----------------------------------------------------------------------------------------------
# Production asset and render roots can live on the external SSD (OBSERVATORY_ASSETS, OBSERVATORY_RENDERS);
# unset, they default to the worktree, so nothing depends on the external drive.
ASSET_ROOT = os.environ.get("OBSERVATORY_ASSETS") or os.path.join(ROOT, "blender", "assets", "polyhaven")
RENDER_ROOT = os.environ.get("OBSERVATORY_RENDERS") or os.path.join(ROOT, "blender", "renders")
HDRI_PATH = os.path.join(ASSET_ROOT, "hdri", "empty_warehouse_01_2k.hdr")
world = bpy.data.worlds.new("Facility")
scene.world = world
world.use_nodes = True
wt = world.node_tree
wn, wl = wt.nodes, wt.links
bg = wn["Background"]
bg.inputs["Color"].default_value = (0.012, 0.016, 0.022, 1)
bg.inputs["Strength"].default_value = 1.0
if os.path.exists(HDRI_PATH):
    env = wn.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(HDRI_PATH, check_existing=True)
    wcoord = wn.new("ShaderNodeTexCoord")
    wmap = wn.new("ShaderNodeMapping")
    wmap.inputs["Rotation"].default_value = (0.0, 0.0, math.radians(90))
    wl.new(wcoord.outputs["Generated"], wmap.inputs["Vector"])
    wl.new(wmap.outputs["Vector"], env.inputs["Vector"])
    lit = wn.new("ShaderNodeBackground")
    lit.inputs["Strength"].default_value = HDRI_STRENGTH
    wl.new(env.outputs["Color"], lit.inputs["Color"])
    lp = wn.new("ShaderNodeLightPath")
    wmix = wn.new("ShaderNodeMixShader")
    wl.new(lp.outputs["Is Camera Ray"], wmix.inputs["Fac"])
    wl.new(lit.outputs[0], wmix.inputs[1])
    wl.new(bg.outputs[0], wmix.inputs[2])
    wl.new(wmix.outputs[0], wn["World Output"].inputs["Surface"])
world.mist_settings.start = 24.0
world.mist_settings.depth = 340.0
world.mist_settings.falloff = "QUADRATIC"
SUN_DIR = Vector((0.42, -0.48, 0.77)).normalized()   # toward the sun (high, beyond the far end, to the right)

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
# ----------------------------------------------------------------------------------------------
# Physically based surfaces from Poly Haven scans (CC0, 2K). Images are loaded once and shared.
# Meshes get axis-projected UVs in metres (see box_uvs), so the maps tile at real-world scale.
# ----------------------------------------------------------------------------------------------
TEX_DIR = os.path.join(ASSET_ROOT, "textures")
_IMAGES = {}


def tex_image(tex_id, kind):
    path = os.path.join(TEX_DIR, f"{tex_id}_{kind}_2k.jpg")
    if not os.path.exists(path):
        return None
    if path not in _IMAGES:
        img = bpy.data.images.load(path, check_existing=True)
        if kind != "diff":
            img.colorspace_settings.name = "Non-Color"
        _IMAGES[path] = img
    return _IMAGES[path]


def pbr(name, tex_id, tile=2.0, tint=(1.0, 1.0, 1.0), metallic=0.0, rough=(0.2, 0.8), normal=0.6,
        fallback=(0.4, 0.4, 0.4), coat=0.0):
    mat = principled(name, fallback, metallic=metallic, roughness=sum(rough) / 2, coat=coat)
    diff = tex_image(tex_id, "diff")
    if diff is None:
        return mat
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1.0 / tile, 1.0 / tile, 1.0 / tile)
    nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])

    def sample(img):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = img
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
        return n

    tint_n = nt.nodes.new("ShaderNodeMix")
    tint_n.data_type = "RGBA"
    tint_n.blend_type = "MULTIPLY"
    tint_n.inputs["Factor"].default_value = 1.0
    tint_n.inputs[7].default_value = (*tint, 1)
    nt.links.new(sample(diff).outputs["Color"], tint_n.inputs[6])
    nt.links.new(tint_n.outputs[2], b.inputs["Base Color"])
    r_img = tex_image(tex_id, "rough")
    if r_img is not None:
        mr = nt.nodes.new("ShaderNodeMapRange")
        mr.inputs["To Min"].default_value, mr.inputs["To Max"].default_value = rough
        nt.links.new(sample(r_img).outputs["Color"], mr.inputs["Value"])
        nt.links.new(mr.outputs["Result"], b.inputs["Roughness"])
    n_img = tex_image(tex_id, "nor_gl")
    if n_img is not None and normal > 0:
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = normal
        nt.links.new(sample(n_img).outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return mat


CLOCKS = []   # Value nodes keyed to the frame number (animated shaders: data pulses, server LEDs)


def clock_node(nt):
    n = nt.nodes.new("ShaderNodeValue")
    CLOCKS.append(n.outputs[0])
    return n.outputs[0]


def pulse(name, color, strength, spacing=8.0, speed=0.1, base=0.06, skew=0.37, metal=None):
    """Trace with comet-like data pulses travelling toward -Y: phase from position plus a frame clock."""
    mat = principled(name, metal or (0.02, 0.02, 0.02), metallic=1.0 if metal else 0.0, roughness=0.3,
                     emission=color, strength=strength)
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    a = math_node(nt, "MULTIPLY_ADD", sep.outputs["X"], skew, sep.outputs["Y"])
    a = math_node(nt, "MULTIPLY_ADD", sep.outputs["Z"], 0.61, a)
    a = math_node(nt, "DIVIDE", a, spacing)
    a = math_node(nt, "MULTIPLY_ADD", clock_node(nt), speed, a)
    a = math_node(nt, "FRACT", a)
    a = math_node(nt, "SUBTRACT", 1.0, a)
    a = math_node(nt, "POWER", a, 14.0)
    a = math_node(nt, "MULTIPLY_ADD", a, 1.0 - base, base)
    a = math_node(nt, "MULTIPLY", a, strength)
    nt.links.new(a, b.inputs["Emission Strength"])
    return mat


def _plane_vec(nt, axes=("Y", "Z")):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    comb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(sep.outputs[axes[0]], comb.inputs["X"])
    nt.links.new(sep.outputs[axes[1]], comb.inputs["Y"])
    return comb.outputs[0], sep


def _brick(nt, vec, width, height, mortar, c1, c2, cm=(0, 0, 0), bias=0.0, offset=0.0):
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.offset = offset
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Brick Width"].default_value = width
    br.inputs["Row Height"].default_value = height
    br.inputs["Mortar Size"].default_value = mortar
    br.inputs["Bias"].default_value = bias
    br.inputs["Color1"].default_value = (*c1, 1)
    br.inputs["Color2"].default_value = (*c2, 1)
    br.inputs["Mortar"].default_value = (*cm, 1)
    nt.links.new(vec, br.inputs["Vector"])
    return br


def office_glazing(name):
    """Curtain wall behind the galleries: mullions, dark glass, some panes lit by screens."""
    mat = principled(name, (0.015, 0.018, 0.022), metallic=0.3, roughness=0.06, coat=1.0,
                     emission=(1, 1, 1), strength=1.5)
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    vec, _ = _plane_vec(nt, ("Y", "Z"))
    br = _brick(nt, vec, 2.4, 1.6, 0.12, (0.0, 0.0, 0.0), (0.78, 0.84, 0.95), bias=-0.72)
    nt.links.new(br.outputs["Color"], b.inputs["Emission Color"])
    return mat


def raised_floor(name):
    mat = principled(name, (0.40, 0.41, 0.43), metallic=0.2, roughness=0.3, coat=0.4)
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    vec, _ = _plane_vec(nt, ("X", "Y"))
    br = _brick(nt, vec, 0.6, 0.6, 0.008, (0.40, 0.41, 0.43), (0.36, 0.37, 0.39), (0.05, 0.05, 0.055))
    nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
    return mat


def server_face(name):
    """Front of a rack: 2U server bezels with per-LED random blinking (one plane per rack row)."""
    mat = principled(name, (0.05, 0.055, 0.06), metallic=0.6, roughness=0.34, emission=(0.3, 1.0, 0.5), strength=0.0)
    nt = mat.node_tree
    b = nt.nodes["Principled BSDF"]
    vec, sep = _plane_vec(nt, ("Y", "Z"))
    bezel = _brick(nt, vec, 0.6, 0.089, 0.004, (0.045, 0.05, 0.056), (0.085, 0.09, 0.098), (0.006, 0.006, 0.007))
    nt.links.new(bezel.outputs["Color"], b.inputs["Base Color"])
    leds = _brick(nt, vec, 0.03, 0.089, 0.0, (0.0, 0.0, 0.0), (1.0, 1.0, 1.0))
    rnd = nt.nodes.new("ShaderNodeRGBToBW")
    nt.links.new(leds.outputs["Color"], rnd.inputs[0])
    r = rnd.outputs[0]
    band = math_node(nt, "FRACT", math_node(nt, "DIVIDE", sep.outputs["Z"], 0.089))
    band = math_node(nt, "LESS_THAN", math_node(nt, "ABSOLUTE", math_node(nt, "SUBTRACT", band, 0.5)), 0.08)
    col = math_node(nt, "FRACT", math_node(nt, "MULTIPLY_ADD", sep.outputs["Y"], 1.0 / 0.6, 0.5))
    zone = math_node(nt, "MULTIPLY", math_node(nt, "GREATER_THAN", col, 0.70), math_node(nt, "LESS_THAN", col, 0.93))
    dot = math_node(nt, "FRACT", math_node(nt, "DIVIDE", sep.outputs["Y"], 0.03))
    dot = math_node(nt, "LESS_THAN", math_node(nt, "ABSOLUTE", math_node(nt, "SUBTRACT", dot, 0.5)), 0.2)
    blink = math_node(nt, "FRACT", math_node(nt, "MULTIPLY_ADD", clock_node(nt), 0.083, math_node(nt, "MULTIPLY", r, 7.31)))
    blink = math_node(nt, "LESS_THAN", blink, 0.6)
    lit = math_node(nt, "MULTIPLY", math_node(nt, "MULTIPLY", band, zone), math_node(nt, "MULTIPLY", dot, blink))
    nt.links.new(math_node(nt, "MULTIPLY", lit, 7.0), b.inputs["Emission Strength"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    el = ramp.color_ramp.elements
    el[0].position, el[0].color = 0.0, (0.25, 1.0, 0.45, 1)
    el[1].position, el[1].color = 1.0, (1.0, 0.62, 0.15, 1)
    e = el.new(0.72)
    e.color = (0.25, 1.0, 0.45, 1)
    e = el.new(0.86)
    e.color = (0.25, 0.85, 1.0, 1)
    ramp.color_ramp.interpolation = "CONSTANT"
    nt.links.new(r, ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Emission Color"])
    return mat


M["concrete"] = pbr("Concrete (scan)", "smooth_concrete_floor", tile=4.0, tint=(0.82, 0.86, 0.9), rough=(0.16, 0.6), normal=0.4, fallback=(0.34, 0.345, 0.35))
M["floor_dark"] = pbr("Floor concrete (scan)", "smooth_concrete_floor", tile=5.0, tint=(0.40, 0.43, 0.48), rough=(0.08, 0.42), normal=0.35)
M["walkway"] = pbr("Tread plate (scan)", "metal_plate", tile=1.2, tint=(0.6, 0.62, 0.66), metallic=0.9, rough=(0.2, 0.5), normal=0.8)
M["hall_wall"] = pbr("Painted steel (scan)", "blue_metal_plate", tile=3.0, tint=(0.58, 0.64, 0.72), metallic=0.5, rough=(0.3, 0.68), normal=0.6)
M["dark"] = pbr("Machine steel (scan)", "blue_metal_plate", tile=1.6, tint=(0.13, 0.14, 0.16), metallic=0.8, rough=(0.22, 0.5), normal=0.5)
M["rack"] = pbr("Rack steel (scan)", "blue_metal_plate", tile=1.0, tint=(0.07, 0.075, 0.085), metallic=0.7, rough=(0.3, 0.55), normal=0.4)
M["pcb"] = principled("Solder mask", (0.010, 0.040, 0.026), roughness=0.26, coat=0.9, specular=0.6)
M["copper"] = principled("Copper", (0.95, 0.58, 0.36), metallic=1.0, roughness=0.26)
M["chip"] = principled("Chip package", (0.014, 0.015, 0.017), roughness=0.42, specular=0.4)
M["cap"] = principled("Capacitor", (0.52, 0.40, 0.26), roughness=0.4)
M["red"] = emissive("Diff red", (1.0, 0.28, 0.24), 4.0)
M["warm_led"] = emissive("Warm LED", (1.0, 0.84, 0.66), 7.0)
M["sky_panel"] = emissive("Skylight", (0.80, 0.88, 1.0), 3.0)
M["fibre"] = principled("Fibre duct", (0.95, 0.70, 0.04), roughness=0.36, coat=0.3)
M["cable_blue"] = principled("Cable blue", (0.04, 0.16, 0.52), roughness=0.5)
M["cable_grey"] = principled("Cable grey", (0.30, 0.31, 0.33), roughness=0.55)
M["ceiling"] = principled("Ceiling", (0.05, 0.052, 0.056), roughness=0.8)
M["screen"] = emissive("Panel screen", (0.35, 0.62, 0.95), 2.2)
M["office_glazing"] = office_glazing("Office glazing")
M["raised_floor"] = raised_floor("Raised floor")
M["server_face"] = server_face("Server faces")
M["board_data"] = pulse("Board data", (0.30, 0.85, 1.0), 9.0, spacing=3.2, speed=0.32, base=0.0, metal=(0.95, 0.58, 0.36))
M["floor_data"] = pulse("Floor data", (0.25, 0.80, 1.0), 6.0, spacing=14.0, speed=0.09, base=0.10)
M["floor_amber"] = pulse("Floor amber", AMBER, 6.0, spacing=19.0, speed=0.07, base=0.08)
M["compiled"] = emissive("Compiled core", (0.72, 0.88, 1.0), 7.0)
M["halo"] = emissive("Test halo", GREEN, 8.0)



def perforated(name):
    mat = principled(name, (0.03, 0.032, 0.036), metallic=0.7, roughness=0.42)
    nt = mat.node_tree
    vec, _ = _plane_vec(nt, ("Y", "Z"))
    br = _brick(nt, vec, 0.012, 0.012, 0.004, (0.055, 0.058, 0.064), (0.05, 0.053, 0.06), (0.0, 0.0, 0.0), offset=0.5)
    nt.links.new(br.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])
    return mat


M["rack_door"] = perforated("Perforated door")
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


def box_uvs(mesh):
    """Axis-projected UVs in metres (box mapping), giving PBR maps real-world scale and valid tangents."""
    if not mesh.polygons:
        return
    uv = mesh.uv_layers.new(name="UVMap")
    data, loops, verts = uv.data, mesh.loops, mesh.vertices
    for poly in mesh.polygons:
        n = poly.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for li in poly.loop_indices:
            co = verts[loops[li].vertex_index].co
            if az >= ax and az >= ay:
                data[li].uv = (co.x, co.y)
            elif ax >= ay:
                data[li].uv = (co.y, co.z)
            else:
                data[li].uv = (co.x, co.z)


_builder_mesh = Builder.mesh


def _builder_mesh_uv(self):
    mesh = _builder_mesh(self)
    box_uvs(mesh)
    return mesh


Builder.mesh = _builder_mesh_uv
_plain_box = box


def box(name, loc, size, mat, bevel=0.0, segments=2, shadow=True):
    obj = _plain_box(name, loc, size, mat, bevel, segments, shadow)
    box_uvs(obj.data)
    return obj


def smooth(mesh):
    for poly in mesh.polygons:
        poly.use_smooth = True
    return mesh


# Key light: high sun entering through the atrium skylights and the CI hall glazing (light shafts in the haze).
sun("Skylight sun", (-SUN_DIR).to_track_quat("-Z", "Y").to_euler(), SUN_STRENGTH, (1.0, 0.87, 0.72), angle=0.6)

# ----------------------------------------------------------------------------------------------
# 0. Display crossing (sky, Y 46 → 28): code glyphs → colour filter → TFT matrix → backlight.
# ----------------------------------------------------------------------------------------------
DZ = 26.0                 # display centre height
Y_CODE, Y_FILTER, Y_TFT, Y_BACK = 40.0, 39.0, 38.0, 36.6
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
# 0b. Driver board (Y 36.3 → 26.2): behind the backlight the camera flies along the display's own
# circuit board, solder mask, copper traces and packages, with data pulses running toward the exit.
# ----------------------------------------------------------------------------------------------
TUN_Y0, TUN_Y1, TUN_W, TUN_H = 36.3, 26.2, 4.2, 3.4
TUN_Z0 = DZ - 1.4
TUN_L, TUN_M = TUN_Y0 - TUN_Y1, (TUN_Y0 + TUN_Y1) / 2
board = Builder("Driver board")
board.box((0, TUN_M, TUN_Z0 - 0.1), (TUN_W + 0.4, TUN_L, 0.2), M["pcb"])
board.box((0, TUN_M, TUN_Z0 + TUN_H + 0.1), (TUN_W + 0.4, TUN_L, 0.2), M["pcb"])
for s in (-1, 1):
    board.box((s * (TUN_W / 2 + 0.1), TUN_M, TUN_Z0 + TUN_H / 2), (0.2, TUN_L, TUN_H), M["pcb"])
# Chassis back cover around the exit aperture.
for s in (-1, 1):
    board.box((s * (TUN_W / 2 + 0.2 + (35.0 - TUN_W / 2 - 0.2) / 2), TUN_Y1 - 0.2, DZ), (35.0 - TUN_W / 2 - 0.2, 0.3, 40.0), M["dark"])
board.box((0, TUN_Y1 - 0.2, (TUN_Z0 + TUN_H + 0.2 + DZ + 20) / 2), (TUN_W + 0.4, 0.3, DZ + 20 - TUN_Z0 - TUN_H - 0.2), M["dark"])
board.box((0, TUN_Y1 - 0.2, (DZ - 20 + TUN_Z0 - 0.2) / 2), (TUN_W + 0.4, 0.3, TUN_Z0 - 0.2 - (DZ - 20)), M["dark"])
traces = Builder("Board traces")
rng_b = random.Random(11)


def on_board(plane, u, y, du, dy, h):
    """Centre and size of a part lying on one inner face of the board corridor."""
    if plane == "floor":
        return (u, y, TUN_Z0 + h / 2), (du, dy, h)
    if plane == "ceil":
        return (u, y, TUN_Z0 + TUN_H - h / 2), (du, dy, h)
    x = -TUN_W / 2 + h / 2 if plane == "left" else TUN_W / 2 - h / 2
    return (x, y, TUN_Z0 + TUN_H / 2 + u), (h, dy, du)


for plane, span in (("floor", TUN_W), ("ceil", TUN_W), ("left", TUN_H), ("right", TUN_H)):
    lanes = int(span / 0.32)
    for i in range(lanes):
        u = -span / 2 + (i + 0.5) * span / lanes
        y = TUN_Y0 - rng_b.uniform(0.0, 0.8)
        while y > TUN_Y1 + 0.4:
            seg_l = rng_b.uniform(0.8, 3.6)
            mat = M["board_data"] if rng_b.random() < 0.6 else M["copper"]
            c, sz = on_board(plane, u, y - seg_l / 2, 0.055, seg_l, 0.012)
            traces.box(c, sz, mat)
            y -= seg_l
            if rng_b.random() < 0.55:
                c, sz = on_board(plane, u, y, 0.13, 0.13, 0.014)
                traces.box(c, sz, M["copper"])
            y -= rng_b.uniform(0.15, 0.7)
    # Packages: QFPs with pins, a large BGA with a heat spreader, capacitor clusters.
    for k in range(5):
        u = rng_b.uniform(-span / 2 + 0.9, span / 2 - 0.9)
        y = rng_b.uniform(TUN_Y1 + 1.2, TUN_Y0 - 1.2)
        size = rng_b.choice((0.7, 0.9, 1.3))
        c, sz = on_board(plane, u, y, size, size, 0.1)
        board.box(c, sz, M["chip"])
        if size > 1.0:
            c, sz = on_board(plane, u, y, size * 0.62, size * 0.62, 0.16)
            board.box(c, sz, M["steel"])
        pins = int(size / 0.09)
        for p in range(pins):
            o = -size / 2 + (p + 0.5) * size / pins
            for pu, py in ((o, size / 2 + 0.04), (o, -size / 2 - 0.04)):
                c, sz = on_board(plane, u + pu, y + py, 0.035, 0.08, 0.02)
                board.box(c, sz, M["steel"])
            for pu, py in ((size / 2 + 0.04, o), (-size / 2 - 0.04, o)):
                c, sz = on_board(plane, u + pu, y + py, 0.08, 0.035, 0.02)
                board.box(c, sz, M["steel"])
    for k in range(10):
        u = rng_b.uniform(-span / 2 + 0.3, span / 2 - 0.3)
        y = rng_b.uniform(TUN_Y1 + 0.5, TUN_Y0 - 0.5)
        for j in range(rng_b.randint(2, 5)):
            c, sz = on_board(plane, u + j * 0.16, y, 0.1, 0.2, 0.08)
            board.box(c, sz, M["cap"])
instance(board.mesh(), "Driver board", bevel=0.004)
instance(traces.mesh(), "Board traces", shadow=False)
for k, (x, z) in enumerate(((-1.2, TUN_Z0 + TUN_H - 0.5), (1.2, TUN_Z0 + 0.5))):
    point_light(f"Board glow {k}", (x, TUN_M, z), 70, (0.35, 0.8, 1.0), 0.4)

# ----------------------------------------------------------------------------------------------
# Atrium: the engineering district. A tall hall with galleries, office glazing, columns, a trussed roof
# with skylights (sun shafts in the haze) and data traces inlaid in the polished floor.
# ----------------------------------------------------------------------------------------------
AT_X, AT_Y0, AT_Y1, AT_H = 48.0, 62.0, -123.4, 54.0
AT_LEN, AT_MID = AT_Y0 - AT_Y1, (AT_Y0 + AT_Y1) / 2
box("Atrium floor", (0, AT_MID, -0.06), (2 * AT_X, AT_LEN, 0.12), M["floor_dark"])
shell = Builder("Atrium shell")
for s in (-1, 1):
    shell.box((s * (AT_X + 0.4), AT_MID, AT_H / 2), (0.8, AT_LEN, AT_H), M["concrete"])
    shell.box((s * (6.0 + (AT_X - 6.0) / 2), AT_Y1, AT_H / 2), (AT_X - 6.0, 0.6, AT_H), M["hall_wall"])
shell.box((0, AT_Y1, (AT_H + 8.2) / 2), (12.0, 0.6, AT_H - 8.2), M["hall_wall"])
shell.box((0, AT_Y0, AT_H / 2), (2 * AT_X, 0.8, AT_H), M["concrete"])
shell.box((0, AT_Y1 + 0.32, 8.35), (12.6, 0.06, 0.25), M["cyan"])          # portal head light
for x in range(-36, 37, 6):                                                # end wall: lit fins and level bands
    if abs(x) > 8:
        shell.box((x, AT_Y1 + 0.45, AT_H / 2 + 2.0), (0.3, 0.5, AT_H - 4.0), M["white_metal"])
        shell.box((x + 0.2, AT_Y1 + 0.71, AT_H / 2 + 2.0), (0.04, 0.02, AT_H - 6.0), M["cyan_soft"])
for z in (16.0, 24.0, 32.0, 40.0):
    shell.box((0, AT_Y1 + 0.34, z - 0.2), (2 * (AT_X - 7.0), 0.06, 0.1), M["warm_led"])
area_light("End wall wash", (0, AT_Y1 + 16.0, 34.0), 60.0, 5000, (0.9, 0.93, 1.0), rot=(math.radians(-70), 0, 0), size_y=6.0, shadow=False)
LEVELS = (8.0, 16.0, 24.0, 32.0, 40.0)
GAL_D = 7.0
gal_glass = Builder("Gallery glass")
for s in (-1, 1):
    edge = s * (AT_X - GAL_D)
    for z in LEVELS:
        shell.box((s * (AT_X - GAL_D / 2), AT_MID, z - 0.3), (GAL_D, AT_LEN, 0.6), M["concrete"])
        shell.box((edge, AT_MID, z - 0.25), (0.3, AT_LEN, 1.0), M["white_metal"])
        shell.box((edge - s * 0.4, AT_MID, z - 0.63), (0.1, AT_LEN, 0.04), M["warm_led"])
        shell.box((edge, AT_MID, z + 1.12), (0.08, AT_LEN, 0.06), M["steel"])
        gal_glass.box((edge, AT_MID, z + 0.6), (0.03, AT_LEN, 1.0), M["glass"])
        area_light(f"Gallery wash {s} {z:.0f}", (s * (AT_X - GAL_D / 2), AT_MID, z - 0.75), GAL_D * 0.8,
                   GALLERY_POWER, (1.0, 0.85, 0.68), size_y=AT_LEN * 0.95, shadow=False)
    shell.box((s * (AT_X - 0.05), AT_MID, AT_H / 2), (0.1, AT_LEN, AT_H), M["office_glazing"])
instance(shell.mesh(), "Atrium shell", bevel=0.01)
instance(gal_glass.mesh(), "Gallery glass", shadow=False)
cols = Builder("Atrium columns")
y = AT_Y0 - 8.0
while y > AT_Y1 + 4.0:
    for s in (-1, 1):
        cols.cyl((s * (AT_X - GAL_D - 0.7), y, AT_H / 2), 0.62, AT_H, M["concrete"], segments=28)
    y -= 12.0
instance(smooth(cols.mesh()), "Atrium columns")
# Roof: a truss at every bay line; each 10 m bay is solid, skylight, solid (the skylights cast no shadow).
roof = Builder("Atrium roof")
sky = Builder("Skylights")
BAY = 10.0
y = AT_Y0
while y > AT_Y1 + 0.1:
    roof.box((0, y, AT_H - 0.3), (2 * AT_X, 0.5, 0.6), M["white_metal"])
    roof.box((0, y, AT_H - 3.2), (2 * AT_X, 0.4, 0.4), M["white_metal"])
    for i in range(-23, 24):
        roof.box((i * 2.0, y, AT_H - 1.75), (0.14, 0.14, 2.9), M["steel"])
        roof.box((i * 2.0 + 1.0, y, AT_H - 1.75), (0.1, 0.1, 3.4), M["steel"],
                 rot=Matrix.Rotation(math.radians(34 if i % 2 else -34), 3, "Y"))
    roof.box((0, y - 1.5, AT_H + 0.25), (2 * AT_X + 1, 3.0, 0.5), M["concrete"])
    roof.box((0, y - 8.5, AT_H + 0.25), (2 * AT_X + 1, 3.0, 0.5), M["concrete"])
    sky.box((0, y - 5.0, AT_H + 0.6), (2 * AT_X, 4.0, 0.08), M["sky_panel"])
    area_light(f"Skylight {y:.0f}", (0, y - 5.0, AT_H - 0.6), 2 * AT_X * 0.9, SKY_POWER, (0.84, 0.91, 1.0),
               size_y=3.6, shadow=False)
    y -= BAY
instance(roof.mesh(), "Atrium roof", bevel=0.01)
instance(sky.mesh(), "Skylights", shadow=False)
# Data traces inlaid in the floor: orthogonal runs with 45-degree jogs and via pads, pulses flowing forward.
floor_tr = Builder("Floor traces")
rng_f = random.Random(7)
for i in range(44):
    x = -38.0 + i * 1.75 + rng_f.uniform(-0.25, 0.25)
    if abs(x) < 5.0:
        continue
    mat = M["floor_amber"] if rng_f.random() < 0.2 else M["floor_data"]
    y = AT_Y0 - rng_f.uniform(2.0, 10.0)
    while y > AT_Y1 + 3.0:
        seg_l = rng_f.uniform(6.0, 24.0)
        floor_tr.box((x, y - seg_l / 2, 0.006), (0.08, seg_l, 0.012), mat)
        y -= seg_l
        floor_tr.box((x, y, 0.008), (0.32, 0.32, 0.016), M["copper"])
        if rng_f.random() < 0.4 and abs(x) > 7.0:
            nx = x + rng_f.choice((-1.75, 1.75))
            if abs(nx) > 5.0:
                floor_tr.box(((x + nx) / 2, y - 0.875, 0.006), (0.08, 2.47, 0.012), mat,
                             rot=Matrix.Rotation(math.radians(45 if nx > x else -45), 3, "Z"))
                x = nx
                y -= 1.75
        y -= rng_f.uniform(0.4, 3.0)
instance(floor_tr.mesh(), "Floor traces", shadow=False)
atrium_air = bpy.data.materials.new("Atrium air")
atrium_air.use_nodes = True
ant = atrium_air.node_tree
ant.nodes.remove(ant.nodes["Principled BSDF"])
apv = ant.nodes.new("ShaderNodeVolumePrincipled")
apv.inputs["Density"].default_value = ATRIUM_HAZE
apv.inputs["Anisotropy"].default_value = 0.6
apv.inputs["Color"].default_value = (0.86, 0.9, 1.0, 1)
ant.links.new(apv.outputs[0], ant.nodes["Material Output"].inputs["Volume"])
box("Atrium air", (0, AT_MID - 0.5, AT_H / 2), (2 * AT_X - 1.0, AT_LEN - 2.0, AT_H - 0.4), atrium_air, shadow=False)

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


# Launch pier: the landing platform stands on a slender pier from the atrium floor.
pier = Builder("Launch pier")
pier.cyl((0, PLAT_Y, 7.0), 1.0, 14.0, M["white_metal"], segments=32)
pier.cyl((0, PLAT_Y, 0.3), 2.4, 0.6, M["concrete"], segments=32)
instance(smooth(pier.mesh()), "Launch pier")
MOVERS = []


def holo_card(name, x, y, lines, accent, w=4.4):
    """Glass status card beside the deck (working changes, review), several lines of text."""
    n = len(lines)
    hgt = 0.36 + 0.42 * n
    z = deck_z(y) + 2.2
    box(f"{name} card", (x, y, z), (w, 0.05, hgt), M["display"], bevel=0.02, shadow=False)
    box(f"{name} edge", (x, y + 0.035, z + hgt / 2 - 0.04), (w, 0.01, 0.05), accent, shadow=False)
    box(f"{name} post", (x, y - 0.1, (deck_z(y) + z - hgt / 2) / 2), (0.06, 0.06, z - hgt / 2 - deck_z(y)), M["steel"])
    box(f"{name} bracket", ((x + math.copysign(4.15, x)) / 2, y - 0.1, deck_z(y) + 0.05), (abs(x) - 4.15, 0.08, 0.08), M["steel"])
    for i, (body, size, mat) in enumerate(lines):
        text(body, (x + w / 2 - 0.22, y + 0.05, z + hgt / 2 - 0.42 - i * 0.42), size, mat)


holo_card("changes", -6.6, 0.0, [("working changes", 0.26, M["label"]), ("M  BooksController.cs", 0.2, M["label"]),
                                 ("+  SearchAsync(query)", 0.2, M["green"]), ("-  Search(query)", 0.2, M["red"])], M["amber"])
holo_card("staged", 6.6, -7.0, [("git add  .  git commit", 0.22, M["label"]), ("staged for the next commit", 0.18, M["label"])], M["cyan"])
# Commit gates: the source passes through a ring at each commit on the feature branch.
for cx, cy, sha, msg in COMMITS[:2]:
    for major, minor, mat, dy in ((1.15, 0.045, M["cyan"], 0.0), (1.32, 0.09, M["white_metal"], 0.06)):
        bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=(cx, cy + dy, deck_z(cy) + 0.6),
                                         rotation=(math.pi / 2, 0, 0), major_segments=72, minor_segments=12)
        g = bpy.context.active_object
        g.name = f"Commit gate {sha} {major}"
        g.data.materials.append(mat)
        g.visible_shadow = False
# Review checkpoint over both lanes before the merge.
REVIEW_Y = -54.0
rz = deck_z(REVIEW_Y)
rv = Builder("Review gate")
for x in (-3.9, 1.4):
    rv.box((x, 0, 1.85), (0.2, 0.34, 3.7), M["white_metal"])
    rv.box((x + (0.12 if x < 0 else -0.12), 0.18, 1.8), (0.02, 0.02, 3.2), M["green"])
rv.box((-1.25, 0, 3.75), (5.6, 0.36, 0.4), M["white_metal"])
rv.box((-1.25, 0.19, 3.56), (4.8, 0.02, 0.04), M["green"])
instance(rv.mesh(), "Review gate", (0, REVIEW_Y, rz), bevel=0.02)
text("PULL REQUEST  .  REVIEW", (-1.25, REVIEW_Y + 0.2, rz + 3.68), 0.18, M["label"], align="CENTER")
holo_card("review", -6.6, REVIEW_Y + 1.5, [("review: approved", 0.22, M["green"]), ("checks: passed", 0.22, M["green"]),
                                          ("merge into main", 0.2, M["label"])], M["green"])


def branch_bridge(name, y, z, accent, label):
    """Another branch crossing the atrium between the galleries, with its own commits moving along it."""
    span = 2 * (AT_X - GAL_D)
    bb = Builder(name)
    bb.box((0, 0, -0.2), (span, 3.6, 0.4), M["walkway"])
    for s in (-1, 1):
        bb.box((0, s * 1.85, -0.45), (span, 0.3, 0.9), M["white_metal"])
        bb.box((0, s * 1.75, 1.12), (span, 0.06, 0.06), M["steel"])
    bb.box((0, 0, -0.68), (span, 1.6, 0.04), M["warm_led"])
    instance(bb.mesh(), name, (0, y, z), bevel=0.01)
    gl = Builder(name + " glass")
    for s in (-1, 1):
        gl.box((0, s * 1.75, 0.55), (span, 0.03, 1.0), M["glass"])
    instance(gl.mesh(), name + " glass", (0, y, z), shadow=False)
    tube(name + " rail", [(-span / 2, y + 1.2, z + 0.06), (0.0, y + 1.2, z + 0.06), (span / 2, y + 1.2, z + 0.06)], 0.045, accent, shadow=False)
    text(label, (14.0, y + 2.02, z - 0.62), 0.42, M["label"], font=FONT_SANS)
    for k in range(2):
        pk = Builder(f"{name} commit {k}")
        pk.cyl((0, 0, 0.09), 0.42, 0.18, M["white_metal"], segments=6)
        pk.cyl((0, 0, 0.2), 0.3, 0.06, accent, segments=6)
        o = instance(pk.mesh(), f"{name} commit {k}", (0, y + 1.2, z + 0.02))
        MOVERS.append((o, -span / 2 + 2.0, span / 2 - 2.0, 0.5 * k, 1 if k == 0 else -1))


branch_bridge("Branch loans", -22.0, 32.0, M["amber"], "feature/loan-reminders")
branch_bridge("Branch hotfix", -74.0, 16.0, M["red"], "hotfix/isbn-validation")
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
text("CONTINUOUS INTEGRATION", (0, AT_Y1 + 0.36, 11.0), 1.5, M["label"], font=FONT_SANS, align="CENTER")

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

# Services: cable ladders with fibre and power bundles, control cabinets, floor safety lines.
svc = Builder("CI services")
HL, HM = HALL_Y0 - HALL_Y1, (HALL_Y0 + HALL_Y1) / 2
for s in (-1, 1):
    tx = s * (HALL_W / 2 - 1.4)
    svc.box((tx, HM, 8.8), (1.0, HL, 0.04), M["steel"])
    for e in (-1, 1):
        svc.box((tx + e * 0.5, HM, 8.9), (0.04, HL, 0.16), M["steel"])
    for dx, mat in ((-0.28, M["fibre"]), (0.0, M["cable_blue"]), (0.28, M["cable_grey"])):
        svc.cyl((tx + dx, HM, 8.95), 0.11, HL, mat, axis="Y", segments=10)
    y = HALL_Y0 - 3.0
    while y > HALL_Y1:
        svc.box((tx, y, 11.4), (0.05, 0.05, 5.0), M["steel"])
        y -= 6.0
    cx = s * (HALL_W / 2 - 0.55)
    y, i = HALL_Y0 - 1.5, 0
    while y > HALL_Y1 + 1.5:
        svc.box((cx, y, 1.05), (0.6, 0.78, 2.1), M["rack"])
        svc.box((cx - s * 0.305, y, 1.9), (0.01, 0.5, 0.04), M["green"] if i % 3 else M["cyan_soft"])
        if i % 4 == 0:
            svc.box((cx - s * 0.305, y, 1.45), (0.01, 0.42, 0.28), M["screen"])
        y -= 0.8
        i += 1
    svc.box((s * 3.4, HM, 0.012), (0.1, HL, 0.012), M["hazard"])
instance(svc.mesh(), "CI services")
# RESTORE consequence: dependency packages leave the store and join the source as it passes.
DEPS = []
for k in range(6):
    s = -1 if k % 2 == 0 else 1
    lvl = 2 + k % 2
    start = Vector((s * 4.25, -138.0 + (k - 2.5) * 1.3, 0.6 + lvl * 1.3 + 0.2))
    d = Builder(f"Dependency {k}")
    d.box((0, 0, 0), (0.3, 0.3, 0.3), M["crate_box"])
    d.box((0, 0, 0), (0.31, 0.06, 0.31), M["cyan"])
    DEPS.append((instance(d.mesh(), f"Dependency {k}", tuple(start), bevel=0.01, shadow=False), start, 129.0 + k * 1.4))
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
# 3. Data hall (Y -214 → -350): raised floor, dense rack rows with blinking server LEDs, fibre runways
# and cable ladders overhead; the release rides the guideway to the production gate at the end.
# ----------------------------------------------------------------------------------------------
DH_Y0, DH_Y1, DH_W, DH_H = -214.0, -350.0, 44.0, 9.0
DH_L, DH_M = DH_Y0 - DH_Y1, (DH_Y0 + DH_Y1) / 2
box("Raised floor", (0, DH_M, -0.03), (DH_W, DH_L, 0.06), M["raised_floor"])
dh = Builder("Data hall shell")
for s in (-1, 1):
    dh.box((s * (DH_W / 2 + 0.2), DH_M, DH_H / 2), (0.4, DH_L, DH_H), M["hall_wall"])
    dh.box((s * (6.0 + (DH_W / 2 - 6.0) / 2), DH_Y0 - 0.5, DH_H / 2), (DH_W / 2 - 6.0, 0.4, DH_H), M["hall_wall"])
dh.box((0, DH_Y0 - 0.5, (DH_H + 8.2) / 2), (12.0, 0.4, DH_H - 8.2), M["hall_wall"])
dh.box((0, DH_Y1 - 0.2, DH_H / 2), (DH_W, 0.4, DH_H), M["hall_wall"])
dh.box((0, DH_M, DH_H + 0.2), (DH_W + 0.8, DH_L, 0.4), M["ceiling"])
y = DH_Y0 - 1.2
while y > DH_Y1:
    dh.box((0, y, DH_H - 0.05), (DH_W, 0.06, 0.1), M["gunmetal"])
    y -= 2.4
for ax in (0.0, 6.9, -6.9, 12.1, -12.1, 17.3, -17.3):
    dh.box((ax, DH_M, DH_H - 0.12), (0.22, DH_L - 2.0, 0.06), M["white_led"])
    area_light(f"Aisle light {ax:.0f}", (ax, DH_M, DH_H - 0.3), 1.2, AISLE_POWER, (0.86, 0.93, 1.0), size_y=DH_L - 4.0, shadow=False)
instance(dh.mesh(), "Data hall shell", bevel=0.01)
RACK_D, RACK_H, PITCH = 1.1, 2.2, 0.6
ROW_START, SEG_RACKS, N_SEGS, SEG_STEP = -220.2, 13, 11, 9.6
ROWS = ((2.6, 1), (6.0, -1), (7.8, 1), (11.2, -1), (13.0, 1), (16.4, -1), (18.2, 1))
racks = Builder("Rack rows")
faces = Builder("Rack faces")
doors = Builder("Rack doors")
over = Builder("Overhead services")
rng_r = random.Random(5)
OL = SEG_STEP * (N_SEGS - 1) + SEG_RACKS * PITCH
OM = ROW_START - OL / 2
for s in (-1, 1):
    for d, facing in ROWS:
        dirx = -s if facing > 0 else s          # the way the server fronts face
        front = s * d
        body_x = front - dirx * RACK_D / 2
        for i in range(N_SEGS):
            y0 = ROW_START - SEG_STEP * i
            seg_l = SEG_RACKS * PITCH
            ym = y0 - seg_l / 2
            racks.box((body_x, ym, RACK_H / 2), (RACK_D, seg_l, RACK_H), M["rack"])
            faces.box((front + dirx * 0.012, ym, 1.12), (0.02, seg_l, 1.9), M["server_face"])
            racks.box((front + dirx * 0.03, ym, RACK_H - 0.06), (0.06, seg_l, 0.12), M["rack"])
            racks.box((front + dirx * 0.03, ym, 0.07), (0.06, seg_l, 0.14), M["rack"])
            for k in range(SEG_RACKS + 1):
                racks.box((front + dirx * 0.03, y0 - k * PITCH, RACK_H / 2), (0.05, 0.05, RACK_H), M["rack"])
            for k in range(SEG_RACKS):
                if rng_r.random() < 0.26:
                    doors.box((front + dirx * 0.05, y0 - (k + 0.5) * PITCH, 1.12), (0.03, 0.56, 2.0), M["rack_door"])
        fx = front - dirx * 0.25
        over.box((fx, OM, 2.72), (0.32, OL, 0.03), M["fibre"])
        for e in (-1, 1):
            over.box((fx + e * 0.15, OM, 2.8), (0.02, OL, 0.15), M["fibre"])
        over.box((body_x, OM, 3.3), (0.6, OL, 0.03), M["steel"])
        over.cyl((body_x - 0.12, OM, 3.37), 0.07, OL, M["cable_blue"], axis="Y", segments=8)
        over.cyl((body_x + 0.1, OM, 3.38), 0.08, OL, M["cable_grey"], axis="Y", segments=8)
        y = ROW_START - 1.5
        while y > ROW_START - OL:
            over.box((fx, y, 2.5), (0.12, 0.12, 0.42), M["fibre"])
            over.box((body_x, y, 6.15), (0.04, 0.04, 5.7), M["steel"])
            y -= 3.0
instance(racks.mesh(), "Rack rows", bevel=0.0)
instance(faces.mesh(), "Rack faces", shadow=False)
instance(doors.mesh(), "Rack doors")
instance(over.mesh(), "Overhead services")
# Guideway along the central cold aisle (continues the CI conveyor).
GW_Y1 = -331.0
gw = Builder("Guideway")
gw.box((0, (DH_Y0 + GW_Y1) / 2, BELT_Z - 0.2), (1.4, DH_Y0 - GW_Y1, 0.18), M["gunmetal"])
for s in (-1, 1):
    gw.box((s * 0.72, (DH_Y0 + GW_Y1) / 2, BELT_Z - 0.02), (0.04, DH_Y0 - GW_Y1, 0.05), M["cyan"])
    gw.box((s * 0.7, (DH_Y0 + GW_Y1) / 2, BELT_Z + 0.12), (0.03, DH_Y0 - GW_Y1, 0.03), M["steel"])
y = DH_Y0 - 1.0
while y > GW_Y1:
    gw.box((0, y, (BELT_Z - 0.3) / 2), (0.24, 0.24, BELT_Z - 0.3), M["white_metal"])
    y -= 4.0
instance(gw.mesh(), "Guideway")
# Production gate: the release docks in the ring; the end wall shows the environment it now runs in.
RING_Y, RING_Z = DH_Y1, 7.0
GATE2_Y = -333.0
pg = Builder("Production gate")
for s in (-1, 1):
    pg.box((s * 2.1, 0, 2.2), (0.45, 0.7, 4.4), M["white_metal"])
    pg.box((s * 1.86, 0.36, 2.0), (0.04, 0.02, 3.6), M["green"])
pg.box((0, 0, 4.6), (4.65, 0.7, 0.5), M["white_metal"])
pg.box((0, 0.36, 4.42), (3.6, 0.02, 0.05), M["green"])
instance(pg.mesh(), "Production gate", (0, GATE2_Y, 0), bevel=0.02)
bpy.ops.mesh.primitive_torus_add(major_radius=0.9, minor_radius=0.05, location=(0, GATE2_Y, BELT_Z + 0.42),
                                 rotation=(math.pi / 2, 0, 0), major_segments=64, minor_segments=10)
dock = bpy.context.active_object
dock.name = "Production dock"
dock.data.materials.append(M["cyan"])
dock.visible_shadow = False
text("DEPLOY  .  production", (0, GATE2_Y + 0.37, 4.52), 0.2, M["label"], align="CENTER")
box("Production display", (0, DH_Y1 + 0.06, 4.4), (18.0, 0.1, 5.0), M["display"], shadow=False)
box("Production display edge", (0, DH_Y1 + 0.12, 6.86), (18.0, 0.02, 0.06), M["cyan"], shadow=False)
text("PRODUCTION", (0, DH_Y1 + 0.13, 5.0), 1.2, M["label"], font=FONT_SANS, align="CENTER")
text("release/v1.0  .  healthy", (0, DH_Y1 + 0.13, 3.9), 0.36, M["green"], align="CENTER")
area_light("Production wash", (0, DH_Y1 + 6.0, 8.4), 10.0, 900, (0.8, 0.9, 1.0), size_y=3.0, rot=(math.radians(-35), 0, 0))
dh_air = bpy.data.materials.new("Data hall air")
dh_air.use_nodes = True
dnt = dh_air.node_tree
dnt.nodes.remove(dnt.nodes["Principled BSDF"])
dpv = dnt.nodes.new("ShaderNodeVolumePrincipled")
dpv.inputs["Density"].default_value = 0.006
dpv.inputs["Anisotropy"].default_value = 0.5
dnt.links.new(dpv.outputs[0], dnt.nodes["Material Output"].inputs["Volume"])
box("Data hall air", (0, DH_M, DH_H / 2), (DH_W - 0.5, DH_L - 1.5, DH_H - 0.3), dh_air, shadow=False)

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
# Artifact states. Git: amber source lines frame the core. BUILD: the lines collapse into a compiled core.
# TEST: a green halo passes over it. PACKAGE: the release crate encloses it (above).
src = Builder("Source lines")
for i, (indent, width) in enumerate(((0.0, 0.62), (0.1, 0.46), (0.2, 0.34), (0.1, 0.52), (0.0, 0.26))):
    src.box((-0.31 + indent + width / 2, 0.0, 0.24 - i * 0.12), (width, 0.012, 0.04), M["amber"])
code_lines = instance(src.mesh(), "Source lines", shadow=False)
cc = Builder("Compiled core")
cc.box((0, 0, 0), (0.24, 0.24, 0.24), M["compiled"])
compiled = instance(cc.mesh(), "Compiled core", bevel=0.02, shadow=False)
compiled.parent = packet
bpy.ops.mesh.primitive_torus_add(major_radius=0.34, minor_radius=0.012, location=(0, 0, 0), major_segments=64, minor_segments=8)
halo = bpy.context.active_object
halo.name = "Test halo"
halo.data.materials.append(M["halo"])
halo.visible_shadow = False
halo.parent = packet

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
BACK_F = next((f for f in range(37) if cross_cam(f).y <= Y_BACK), 18)   # frame the camera meets the backlight
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
    backlight_strength.default_value = 0.5 + 16.0 * max(0.0, 1.0 - abs(f - BACK_F) / 2.0)
    # No depth of field inside the display (it only added noise there); cinematic focus once outside.
    cam_data.dof.aperture_fstop = 128.0 if f < 34 else 5.6
    cam_data.dof.keyframe_insert("aperture_fstop", frame=f)
    backlight_strength.keyframe_insert("default_value", frame=f)

# Shader clocks, artifact states, other branches' commits and the restored dependencies.
halo_strength = M["halo"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
for f in range(N_FRAMES):
    p = keyed(PACKET_KEYS, f)
    for sock in CLOCKS:
        sock.default_value = float(f)
        sock.keyframe_insert("default_value", frame=f)
    k_lines = ss(46, 56, f) * (1.0 - ss(143, 150, f))
    code_lines.location = p + Vector((0.0, -0.17, 0.0))
    code_lines.scale = (max(k_lines, 0.001),) * 3
    code_lines.keyframe_insert("location", frame=f)
    code_lines.keyframe_insert("scale", frame=f)
    k_comp = ss(148, 152, f)
    compiled.scale = (max(k_comp, 0.001),) * 3
    compiled.keyframe_insert("scale", frame=f)
    packet.hide_render = f >= 150
    packet.keyframe_insert("hide_render", frame=f)
    packet_light.data.color = AMBER if f < 150 else (0.75, 0.88, 1.0)
    packet_light.data.keyframe_insert("color", frame=f)
    hk = (f - 159) / 8.0
    on = 0.0 <= hk <= 1.0
    halo.scale = ((0.5 + 2.6 * hk),) * 3 if on else (0.001,) * 3
    halo.keyframe_insert("scale", frame=f)
    halo_strength.default_value = 8.0 * (1.0 - hk) if on else 0.0
    halo_strength.keyframe_insert("default_value", frame=f)
    for o, x0, x1, ph, dirn in MOVERS:
        u = (f / (N_FRAMES - 1) * 0.6 + ph) % 1.0
        o.location.x = x0 + (x1 - x0) * (u if dirn > 0 else 1.0 - u)
        o.keyframe_insert("location", frame=f)
    for o, start, f0 in DEPS:
        k = (f - f0) / 7.0
        if k <= 0:
            o.location, sc = start, 1.0
        elif k < 1:
            e = k * k * (3 - 2 * k)
            o.location = start.lerp(p, e) + Vector((0.0, 0.0, 0.8 * math.sin(math.pi * k)))
            sc = 1.0 - 0.75 * e
        else:
            o.location, sc = p, 0.001
        o.scale = (sc, sc, sc)
        o.keyframe_insert("location", frame=f)
        o.keyframe_insert("scale", frame=f)
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
    haze.inputs[2].default_value = (0.06, 0.08, 0.11, 1)
    mist_amt = tree.nodes.new("CompositorNodeMath")
    mist_amt.operation = "MULTIPLY"
    mist_amt.inputs[1].default_value = HAZE_MIX
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
    for attr, value in (("quality", "HIGH"), ("mix", -0.65), ("threshold", 1.6), ("size", 7)):
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
            "generator": GENERATOR, "blender": bpy.app.version_string}
    with open(os.path.join(out_dir, "packet.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, separators=(",", ":"))
    print("Packet path written:", out_dir)


if MODE == "export":
    export_packet()
elif MODE == "save":
    os.makedirs(os.path.join(ROOT, "blender", "scenes"), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, "blender", "scenes", f"pipeline_{VARIANT}.blend"))
else:
    out_dir = os.path.join(RENDER_ROOT, OUT_NAME)
    os.makedirs(out_dir, exist_ok=True)
    frames = [int(x) for x in FRAMES_ARG.split(",") if x] if FRAMES_ARG else range(N_FRAMES)
    for f in frames:
        scene.frame_set(f)
        scene.render.filepath = os.path.join(out_dir, f"{f:04d}.png")
        t_frame = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"Frame {f} render seconds: {time.time() - t_frame:.2f} engine={scene.render.engine}")
        if f == frames[0]:
            try:
                import gpu
                print("GPU platform:", gpu.platform.vendor_get(), "|", gpu.platform.renderer_get(), "|", gpu.platform.version_get())
            except Exception as exc:
                print("GPU platform unavailable:", exc)
        with open(os.path.join(out_dir, "frames.jsonl"), "a", encoding="utf-8") as log_fh:   # version guard for the encoder
            log_fh.write(json.dumps({"frame": f, "generator": GENERATOR, "variant": VARIANT}) + "\n")
        print(f"Rendered frame {f}")
    if EXPORT:
        export_packet()
