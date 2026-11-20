"""Engineering Observatory: runtime sequence (v1).

One catalogue search followed through the running application: the request reaches the server, passes the
ASP.NET Core middleware pipeline, is routed to the catalogue endpoint, validated, handled by a service,
translated by EF Core into a parameterised query, answered by SQL Server, and returned as JSON.

Conceptual visualisation. The route (GET /api/catalogue?search=…), the other endpoint names on the routing
signs and the JSON response shape match the public read-only Folio demo (checked 19 November 2026); the
records are its synthetic sample catalogue. Middleware stage names and the SQL text are illustrative.

Shares the render settings, world, materials and builders of pipeline_scene.py (executed up to its first
chapter), so both sequences grade and light the same way.
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
_src = open(os.path.join(HERE, "pipeline_scene.py"), encoding="utf-8").read()
_cut = _src.rfind("# -----", 0, _src.index("# 0. Display crossing"))
exec(compile(_src[:_cut], os.path.join(HERE, "pipeline_scene.py"), "exec"))

GENERATOR = "blender/scripts/runtime_scene.py (v1)"
N_FRAMES = 240
T_START, T_END = 3.97, 7.45          # chapter progress covered (kept in sync with the page timeline)
scene.frame_start, scene.frame_end = 0, N_FRAMES - 1
for o in [o for o in bpy.data.objects if o.type == "LIGHT" and o.data.type == "SUN"]:
    bpy.data.objects.remove(o)
scene.view_settings.exposure = 0.1
world.mist_settings.start, world.mist_settings.depth = 12.0, 140.0

RT_CYAN = (0.25, 0.82, 1.0)
M["req"] = emissive("Request pulse", RT_CYAN, 14.0)
M["json"] = emissive("JSON glyph", (1.0, 0.78, 0.42), 4.0)
M["json_key"] = emissive("JSON key", (0.55, 0.85, 1.0), 4.0)
M["record"] = emissive("Record glow", (1.0, 0.7, 0.32), 0.0)
M["gate_edge"] = pulse("Gate edge", RT_CYAN, 7.0, spacing=2.0, speed=0.12, base=0.35)
M["route_off"] = emissive("Route idle", (0.35, 0.45, 0.55), 1.2)


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
    return Vector(keys[-1][1] if f > frames[-1] else keys[0][1])


def card(name, loc, w, lines, accent, line_h=0.42, rot=FACE_CAMERA, size=0.22):
    """Dark glass status card with an accent edge and lines of text (facing +Y by default)."""
    hgt = 0.34 + line_h * len(lines)
    c = box(f"{name} card", loc, (w, 0.05, hgt), M["display"], bevel=0.02, shadow=False)
    c.rotation_euler = (0, 0, rot[2] - math.pi)
    e = box(f"{name} edge", (0, 0.035, hgt / 2 - 0.04), (w, 0.01, 0.05), accent, shadow=False)
    e.parent = c
    for i, entry in enumerate(lines):
        body, mat = entry[0], entry[1]
        sz = entry[2] if len(entry) > 2 else size
        t = text(body, (w / 2 - 0.22, 0.04, hgt / 2 - line_h - i * line_h + 0.06), sz, mat, rot=(math.pi / 2, 0, math.pi))
        t.parent = c
    return c


# ----------------------------------------------------------------------------------------------
# 0. Edge (frames 0–24, at Y 300): the request arrives on a fibre into a production server's network port.
# ----------------------------------------------------------------------------------------------
EDGE_Y = 300.0
edge = Builder("Edge racks")
for k in range(-6, 7):
    edge.box((k * 0.6, EDGE_Y - 0.55, 1.1), (0.6, 1.1, 2.2), M["rack"])
    edge.box((k * 0.6 + 0.3, EDGE_Y + 0.03, 1.1), (0.05, 0.05, 2.2), M["rack"])
    edge.box((k * 0.6, EDGE_Y - 4.2, 1.1), (0.6, 1.1, 2.2), M["rack"])          # the row behind (seen past the edges)
edge.box((0, EDGE_Y + 1.5, 3.6), (9.0, 6.0, 0.1), M["ceiling"])
for x in (-1.8, 1.8):
    edge.box((x, EDGE_Y + 1.5, 3.53), (0.12, 6.0, 0.04), M["white_led"])
instance(edge.mesh(), "Edge racks")
for s_ in (-1, 1):
    side = box(f"Edge side faces {s_}", (s_ * 2.4, EDGE_Y + 0.012, 1.12), (0.02, 2.95, 1.9), M["server_face"], shadow=False)
    side.rotation_euler = (0, 0, math.pi / 2)
edge_face = box("Edge faces", (0, EDGE_Y + 0.012, 1.12), (0.02, 1.86, 1.9), M["server_face"], shadow=False)
edge_face.rotation_euler = (0, 0, math.pi / 2)      # the face material runs along local Y
nic = Builder("Network card")
nic.box((0.12, EDGE_Y + 0.03, 1.35), (0.46, 0.04, 0.08), M["gunmetal"])
for k in range(4):
    nic.box((-0.03 + k * 0.1, EDGE_Y + 0.05, 1.35), (0.07, 0.01, 0.045), M["chip"])
instance(nic.mesh(), "Network card")
port_glow = box("Port glow", (-0.03, EDGE_Y + 0.056, 1.35), (0.06, 0.004, 0.036), emissive("Port light", RT_CYAN, 2.0), shadow=False)
PORT = Vector((-0.03, EDGE_Y + 0.06, 1.35))
fibre_pts = [(-0.03, EDGE_Y + 0.12, 1.35), (-0.03, EDGE_Y + 0.32, 1.42), (-0.05, EDGE_Y + 0.42, 1.9), (0.0, EDGE_Y + 0.38, 2.6), (0.1, EDGE_Y + 0.3, 3.4)]
tube("Patch fibre", fibre_pts, 0.012, M["fibre"])
box("Connector", (-0.03, EDGE_Y + 0.09, 1.35), (0.05, 0.06, 0.04), M["cable_blue"])
box("Edge duct", (0.1, EDGE_Y + 0.3, 3.45), (0.32, 6.0, 0.12), M["fibre"])
box("Edge floor", (0, EDGE_Y + 1.0, -0.03), (9.0, 10.0, 0.06), M["raised_floor"])
area_light("Edge aisle", (0, EDGE_Y + 2.2, 3.6), 1.0, 160, (0.86, 0.93, 1.0), size_y=4.0, shadow=False)

# ----------------------------------------------------------------------------------------------
# 1. Inside the server (Y 8 → -46): the HTTP entry, then the middleware pipeline as a run of gates.
# ----------------------------------------------------------------------------------------------
HALL_W, HALL_H = 14.0, 7.0
SHAFT_Y, SHAFT_W, SHAFT_D = -116.0, 7.0, 4.4
fl = Builder("Runtime floor")
fl.box((0, (15.0 + SHAFT_Y + SHAFT_D / 2) / 2, -0.05), (44.0, 15.0 - SHAFT_Y - SHAFT_D / 2, 0.1), M["floor_dark"])
fl.box((0, (SHAFT_Y - SHAFT_D / 2 - 135.0) / 2, -0.05), (44.0, 135.0 + SHAFT_Y - SHAFT_D / 2, 0.1), M["floor_dark"])
for s in (-1, 1):
    fl.box((s * (SHAFT_W / 2 + 9.25), SHAFT_Y, -0.05), (18.5, SHAFT_D, 0.1), M["floor_dark"])
    fl.box((s * (SHAFT_W / 2 + 0.1), SHAFT_Y, -2.0), (0.2, SHAFT_D, 4.0), M["rack"])           # shaft lining
    fl.box((0, SHAFT_Y + s * (SHAFT_D / 2 + 0.1), -2.0), (SHAFT_W, 0.2, 4.0), M["rack"])
instance(fl.mesh(), "Runtime floor")
walls = Builder("Runtime walls")
WALL_END = -118.6
for s in (-1, 1):
    for y0, y1 in ((8.0, -46.0), (-74.0, WALL_END)):         # the routing hub opens the walls
        walls.box((s * HALL_W / 2, (y0 + y1) / 2, HALL_H / 2), (0.4, y0 - y1, HALL_H), M["rack"])
    for yc in (-46.0, -74.0):
        walls.box((s * (HALL_W / 2 + 3.25), yc, HALL_H / 2), (6.5, 0.4, HALL_H), M["rack"])
    y = 6.0
    while y > WALL_END + 1.0:
        if not (-74.0 < y < -46.0):
            walls.box((s * (HALL_W / 2 - 0.25), y, HALL_H / 2), (0.12, 0.3, HALL_H), M["white_metal"])
            walls.box((s * (HALL_W / 2 - 0.32), y - 0.3, HALL_H / 2), (0.02, 0.04, HALL_H - 0.6), M["cyan_soft"])
        y -= 3.0
walls.box((0, (8.0 + WALL_END) / 2, HALL_H + 0.2), (HALL_W + 14.0, 8.0 - WALL_END, 0.4), M["ceiling"])
for x in (-3.0, 0.0, 3.0):
    walls.box((x, -52.0, HALL_H - 0.05), (0.12, 118.0, 0.05), M["white_led"])
instance(walls.mesh(), "Runtime walls")
for k, y in enumerate((-4.0, -24.0, -44.0, -84.0, -104.0)):
    area_light(f"Runtime fill {k}", (0, y, HALL_H - 0.4), 6.0, 900, (0.82, 0.9, 1.0), size_y=14.0, shadow=False)
tr = Builder("Runtime traces")
rng = random.Random(21)
for i in range(18):
    x = -6.0 + i * 0.7
    if abs(x) < 1.2:
        continue
    y = 8.0
    while y > -110.0:
        seg_l = rng.uniform(4.0, 14.0)
        tr.box((x, y - seg_l / 2, 0.006), (0.05, seg_l, 0.012), M["floor_data"])
        y -= seg_l + rng.uniform(0.5, 2.0)
instance(tr.mesh(), "Runtime traces", shadow=False)
track = Builder("Request track")
track.box((0, -52.0, 0.03), (0.5, 120.0, 0.06), M["gunmetal"])
for s in (-1, 1):
    track.box((s * 0.27, -52.0, 0.07), (0.03, 120.0, 0.03), M["cyan"])
instance(track.mesh(), "Request track", shadow=False)

entry = Builder("HTTPS entry")
for s in (-1, 1):
    entry.box((s * 3.1, 0, 2.2), (0.6, 0.8, 4.4), M["white_metal"])
entry.box((0, 0, 4.6), (6.8, 0.8, 0.5), M["white_metal"])
instance(entry.mesh(), "HTTPS entry", (0, 2.0, 0), bevel=0.02)
entry_glow = box("Entry light", (0, 2.0, 2.2), (5.6, 0.02, 4.4), emissive("Entry light", (0.75, 0.92, 1.0), 0.0), shadow=False)
text("HTTPS  .  KESTREL", (0, 2.42, 4.48), 0.24, M["label"], align="CENTER")
MIDDLEWARE = ("EXCEPTION HANDLING", "HTTPS REDIRECTION", "STATIC FILES", "ROUTING", "AUTHENTICATION", "AUTHORIZATION")
for k, name in enumerate(MIDDLEWARE):
    gy = -6.0 - k * 6.5
    g = Builder(f"Middleware {k}")
    for s in (-1, 1):
        g.box((s * 2.4, 0, 1.6), (0.22, 0.3, 3.2), M["white_metal"])
        g.box((s * 2.26, 0.16, 1.6), (0.03, 0.02, 2.9), M["gate_edge"])
    g.box((0, 0, 3.32), (5.02, 0.3, 0.28), M["white_metal"])
    g.box((0, 0.16, 3.16), (4.4, 0.02, 0.03), M["gate_edge"])
    instance(g.mesh(), f"Middleware {k}", (0, gy, 0), bevel=0.012)
    text(name, (0, gy + 0.17, 3.24), 0.13, M["label"], align="CENTER")
card("Middleware", (-4.6, -14.0, 2.4), 3.6, [("MIDDLEWARE PIPELINE", M["label"], 0.22), ("each stage can act on the", M["label"], 0.17),
                                              ("request, then pass it on", M["label"], 0.17), ("stage names illustrative", M["route_off"], 0.15)], M["cyan"])
card("Request", (4.4, -2.0, 2.3), 4.4, [("GET /api/catalogue", M["label"], 0.24), ("    ?search=reliable", M["label"], 0.22),
                                         ("Accept: application/json", M["route_off"], 0.17)], M["cyan"])

# ----------------------------------------------------------------------------------------------
# 2. Routing hub (Y -46 → -74): endpoints fan out; /api/catalogue lights as the match.
# ----------------------------------------------------------------------------------------------
HUB_Y = -60.0
hub = Builder("Routing hub")
hub.cyl((0, HUB_Y, 0.02), 13.0, 0.04, M["floor_dark"], segments=96)
hub.cyl((0, HUB_Y, 0.05), 3.2, 0.06, M["gunmetal"], segments=64)
for s in (-1, 1):
    hub.box((s * (HALL_W / 2 + 6.5), HUB_Y, HALL_H / 2), (0.4, 28.0, HALL_H), M["rack"])
instance(hub.mesh(), "Routing hub")
bpy.ops.mesh.primitive_torus_add(major_radius=3.2, minor_radius=0.05, location=(0, HUB_Y, 0.1), major_segments=96, minor_segments=8)
hub_ring = bpy.context.active_object
hub_ring.data.materials.append(M["cyan"])
ROUTES = [(-62, "/api/session"), (-38, "/api/loans"), (-16, "/api/account"), (0, "/api/catalogue"),
          (16, "/api/catalogue/categories"), (38, "/api/catalogue/authors"), (62, "/api/admin/summary")]
for ang, path in ROUTES:
    a = math.radians(ang)
    d = Vector((math.sin(a), -math.cos(a), 0.0))
    p0 = Vector((0, HUB_Y, 0.1)) + d * 3.2
    p1 = Vector((0, HUB_Y, 0.1)) + d * 12.5
    sel = ang == 0
    tube(f"Route {path}", [tuple(p0), tuple((p0 + p1) / 2), tuple(p1)], 0.05 if sel else 0.03, M["cyan"] if sel else M["route_off"], shadow=False)
    sign_at = Vector((0, HUB_Y, 0)) + d * (9.0 if sel else 10.5)
    if not sel:
        c = card(f"Route {path}", (sign_at.x, sign_at.y, 2.1), 3.0, [(path, M["label"], 0.17)], M["route_off"], line_h=0.34)
        c.rotation_euler = (0, 0, a)
card("Route match", (-4.3, HUB_Y - 9.0, 2.6), 3.8, [("ROUTE MATCHED", M["label"], 0.22), ("GET /api/catalogue", M["cyan"], 0.2)], M["cyan"])

# ----------------------------------------------------------------------------------------------
# 3. Controller, validation, service (Y -74 → -102).
# ----------------------------------------------------------------------------------------------
def station(name, y, title, lines, accent):
    st = Builder(name)
    for s in (-1, 1):
        st.box((s * 2.9, 0, 1.9), (0.5, 1.2, 3.8), M["white_metal"])
        st.box((s * 2.62, 0.62, 1.9), (0.04, 0.02, 3.3), accent)
    st.box((0, 0, 4.0), (6.3, 1.2, 0.5), M["white_metal"])
    st.box((0, 0.62, 3.78), (5.4, 0.02, 0.04), accent)
    instance(st.mesh(), name, (0, y, 0), bevel=0.02)
    text(title, (0, y + 0.63, 3.93), 0.2, M["label"], align="CENTER")
    card(name + " card", (4.9, y + 1.0, 2.4), 3.8, lines, accent)


station("Controller", -78.0, "CONTROLLER  .  CATALOGUE ENDPOINT", [("CONTROLLER", M["label"], 0.22), ("binds the query string", M["label"], 0.17),
                                                                  ("and calls the service", M["label"], 0.17)], M["cyan"])
station("Validation", -86.0, "VALIDATION", [("VALIDATION", M["label"], 0.22), ("query parameters checked", M["label"], 0.17),
                                            ("invalid input -> 400", M["route_off"], 0.17)], M["green"])
station("Service", -96.0, "SERVICE  .  CATALOGUE SEARCH", [("APPLICATION SERVICE", M["label"], 0.22), ("public catalogue rules", M["label"], 0.17),
                                                          ("read-only in the demo", M["route_off"], 0.17)], M["violet"])
# EF Core: LINQ becomes parameterised SQL (illustrative text).
station("Data access", -106.0, "DATA ACCESS  .  EF CORE", [("EF CORE", M["label"], 0.22), ("LINQ -> parameterised SQL", M["label"], 0.17),
                                                         ("illustrative query", M["route_off"], 0.15)], M["amber"])
card("SQL", (-4.6, -104.0, 2.5), 4.2, [("WHERE Title LIKE @search", M["json"], 0.19), ("   OR Author LIKE @search", M["json"], 0.19),
                                        ("ORDER BY Title", M["json"], 0.19), ("conceptual SQL", M["route_off"], 0.15)], M["amber"])
# The descent: a shaft in the floor at the end of the hall down to the database.
for sx in (-1, 1):                                   # light strips running down the shaft into the vault
    for sy in (-1, 1):
        box(f"Shaft strip {sx} {sy}", (sx * (SHAFT_W / 2 - 0.05), SHAFT_Y + sy * (SHAFT_D / 2 - 0.05), -2.0), (0.06, 0.06, 4.0), M["amber"], shadow=False)
for s in (-1, 1):
    box(f"Shaft lip {s}", (s * (SHAFT_W / 2 + 0.1), SHAFT_Y, 0.06), (0.12, SHAFT_D, 0.12), M["amber"], shadow=False)
box("Hall end", (0, WALL_END, HALL_H / 2), (HALL_W + 0.8, 0.4, HALL_H), M["rack"])

# ----------------------------------------------------------------------------------------------
# 4. Database chamber (below the hall): SQL Server as a cylindrical vault of record pages around an index.
# ----------------------------------------------------------------------------------------------
DB = Vector((0, -116.0, -34.0))     # chamber floor centre (the vault top is 4 m below the hall floor)
DB_R, DB_H = 15.0, 30.0
vault = Builder("Database vault")
N_RIB = 48
for k in range(N_RIB):
    a = 2 * math.pi * k / N_RIB
    rot = Matrix.Rotation(-a, 3, "Z")
    pos = DB + Vector((math.sin(a) * DB_R, math.cos(a) * DB_R, DB_H / 2))
    vault.box(tuple(pos), (0.3, 0.5, DB_H), M["white_metal"], rot=rot)
    for lvl in range(14):
        z = DB.z + 1.4 + lvl * 2.0
        pos2 = DB + Vector((math.sin(a + math.pi / N_RIB) * (DB_R - 0.1), math.cos(a + math.pi / N_RIB) * (DB_R - 0.1), z - DB.z))
        vault.box(tuple(pos2), (2 * math.pi * DB_R / N_RIB * 0.86, 0.3, 1.5), M["rack"], rot=Matrix.Rotation(-(a + math.pi / N_RIB), 3, "Z"))
vault.cyl((DB.x, DB.y, DB.z - 0.2), DB_R + 0.5, 0.4, M["floor_dark"], segments=96)
instance(vault.mesh(), "Database vault")
# Record pages: emissive rows on the vault faces (one plane per bay, a row pattern from a brick texture).
rows_mat = principled("Record rows", (0.02, 0.025, 0.03), roughness=0.4, emission=(1, 1, 1), strength=1.4)
_nt = rows_mat.node_tree
_vec, _ = _plane_vec(_nt, ("X", "Z"))
_br = _brick(_nt, _vec, 0.9, 0.16, 0.05, (0.08, 0.16, 0.22), (0.35, 0.62, 0.8), bias=-0.3)
_nt.links.new(_br.outputs["Color"], _nt.nodes["Principled BSDF"].inputs["Emission Color"])
pages = Builder("Record pages")
for k in range(N_RIB):
    a = 2 * math.pi * k / N_RIB + math.pi / N_RIB
    for lvl in range(14):
        z = 1.4 + lvl * 2.0
        pos = DB + Vector((math.sin(a) * (DB_R - 0.27), math.cos(a) * (DB_R - 0.27), z))
        pages.box(tuple(pos), (2 * math.pi * DB_R / N_RIB * 0.8, 0.02, 1.36), rows_mat, rot=Matrix.Rotation(-a, 3, "Z"))
instance(pages.mesh(), "Record pages", shadow=False)
text("SQL SERVER", (DB.x, DB.y - DB_R + 0.5, DB.z + DB_H - 3.0), 1.6, M["label"], font=FONT_SANS, align="CENTER")
# Index: root → branch → leaf nodes joined by light, the query path lit.
ROOT_N = DB + Vector((0, 0, 20.0))
BRANCH = [DB + Vector((x, 0, 13.0)) for x in (-5.0, 0.0, 5.0)]
LEAVES = [DB + Vector((x, y, 6.0)) for x in (-7.0, -3.5, 0.0, 3.5, 7.0) for y in (-3.0, 3.0)]
HIT_BRANCH, HIT_LEAF = BRANCH[1], LEAVES[5]          # leaf (0, +3) under the middle branch, on the camera side
idx = Builder("Index nodes")
for p in [ROOT_N] + BRANCH + LEAVES:
    idx.box(tuple(p), (1.3, 0.5, 0.5), M["gunmetal"])
    idx.box(tuple(p + Vector((0, 0.26, 0))), (1.1, 0.02, 0.3), M["cyan_soft"])
instance(idx.mesh(), "Index nodes", bevel=0.03)
for b in BRANCH:
    tube("Index edge", [tuple(ROOT_N), tuple((ROOT_N + b) / 2 + Vector((0, 0, 0.6))), tuple(b)], 0.03, M["cyan"] if b == HIT_BRANCH else M["route_off"], shadow=False)
for i, lf in enumerate(LEAVES):
    b = BRANCH[min(2, int((lf.x + 7.0) / 5.0))]
    tube("Index leaf edge", [tuple(b), tuple((b + lf) / 2 + Vector((0, 0, 0.4))), tuple(lf)], 0.02, M["cyan"] if lf == HIT_LEAF else M["route_off"], shadow=False)
# The matching record (synthetic sample catalogue from the public demo) and its neighbours.
RECORDS = ["5  Practical Patterns in Software  .  Elena Marlow", "7  Building Reliable Web Services  .  Rhea Calder",
           "6  Signals and Systems Made Clear  .  Ishan Merrow", "8  The Curious Database  .  Owen Halden"]
REC_POS = [HIT_LEAF + Vector((0, 0.4, -1.4 - 0.62 * i)) for i in range(len(RECORDS))]
rec_objs = []
for i, (body, pos) in enumerate(zip(RECORDS, REC_POS)):
    mat = M["record"] if i == 1 else M["route_off"]
    slab = box(f"Record {i}", tuple(pos), (5.6, 0.06, 0.48), M["display"], bevel=0.02, shadow=False)
    bar = box(f"Record {i} bar", (0, 0.04, -0.2), (5.6, 0.01, 0.04), mat, shadow=False)
    bar.parent = slab
    t = text(body, (2.6, 0.05, -0.08), 0.17, M["label"], rot=(math.pi / 2, 0, math.pi))
    t.parent = slab
    rec_objs.append(slab)
for k, (x, z) in enumerate(((-9.0, 8.0), (9.0, 8.0), (0.0, 26.0))):
    area_light(f"Vault light {k}", tuple(DB + Vector((x, 0, z))), 6.0, 1400, (0.8, 0.9, 1.0), size_y=6.0, shadow=False)
point_light("Index glow", tuple(DB + Vector((0, 0, 12))), 600, RT_CYAN, 2.0)
air = bpy.data.materials.new("Runtime air")
air.use_nodes = True
_an = air.node_tree
_an.nodes.remove(_an.nodes["Principled BSDF"])
_av = _an.nodes.new("ShaderNodeVolumePrincipled")
_av.inputs["Density"].default_value = 0.012
_av.inputs["Anisotropy"].default_value = 0.5
_an.links.new(_av.outputs[0], _an.nodes["Material Output"].inputs["Volume"])
box("Runtime air", (0, -52.0, HALL_H / 2), (HALL_W - 0.5, 118.0, HALL_H - 0.3), air, shadow=False)
box("Vault air", (DB.x, DB.y, DB.z + DB_H / 2), (2 * DB_R - 1, 2 * DB_R - 1, DB_H - 0.5), air, shadow=False)
# Exit to the browser: a bright aperture at the top of the vault (the response leaves the server here).
aperture = box("Browser aperture", (DB.x, DB.y, DB.z + DB_H + 0.45), (SHAFT_W, SHAFT_D, 0.05), emissive("Browser light", (0.92, 0.96, 1.0), 0.0), shadow=False)

# ----------------------------------------------------------------------------------------------
# The followed object: request pulse → compact query packet → JSON response card.
# ----------------------------------------------------------------------------------------------
bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.16)
pulse_o = bpy.context.active_object
pulse_o.name = "Request pulse"
pulse_o.scale = (1.0, 2.6, 1.0)
pulse_o.data.materials.append(M["req"])
pulse_o.visible_shadow = False
for poly in pulse_o.data.polygons:
    poly.use_smooth = True
pulse_light = point_light("Request light", (0, 0, 0), 120, RT_CYAN, 0.1)
qp = Builder("Query packet")
qp.box((0, 0, 0), (0.26, 0.26, 0.26), M["compiled"])
for sx in (-1, 1):
    for sz in (-1, 1):
        qp.box((sx * 0.14, 0, sz * 0.14), (0.02, 0.3, 0.02), M["amber"])
query_o = instance(qp.mesh(), "Query packet", shadow=False)
JSON_LINES = [("{", M["json"]), ('  "items": [ {', M["json"]), ('    "id": 7,', M["json_key"]),
              ('    "title": "Building Reliable Web Services",', M["json_key"]), ('    "author": "Rhea Calder",', M["json_key"]),
              ('    "category": "Technology"', M["json_key"]), ("  } ],", M["json"]), ('  "total": 1, "page": 1, "pageSize": 12', M["json"]), ("}", M["json"])]
json_card = box("JSON card", (0, 0, 0), (4.2, 0.05, 2.7), M["display"], bevel=0.03, shadow=False)
json_edge = box("JSON edge", (0, 0.035, 1.31), (4.2, 0.01, 0.05), M["amber"], shadow=False)
json_edge.parent = json_card
for i, (body, mat) in enumerate(JSON_LINES):
    t = text(body, (1.95, 0.04, 1.05 - i * 0.27), 0.15, mat, rot=(math.pi / 2, 0, math.pi))
    t.parent = json_card

# Timeline (frames): edge 0–24 · entry 25–34 · middleware 34–62 · routing 62–82 · controller/validation/service
# 82–118 · EF Core 118–132 · descent 132–166 · record 166–184 · response rises 184–239.
LEAF_UP = HIT_LEAF + Vector((0, 0.6, 0))
ART = [(0, (0.1, EDGE_Y + 0.3, 3.3)), (8, (-0.05, EDGE_Y + 0.42, 1.95)), (16, (-0.03, EDGE_Y + 0.2, 1.38)), (24, tuple(PORT)),
       (25, (0, 4.0, 1.3)), (34, (0, -2.0, 1.3)), (48, (0, -20.0, 1.3)), (62, (0, -40.0, 1.3)), (72, (0, -52.0, 1.3)),
       (82, (0, -66.0, 1.3)), (92, (0, -78.0, 1.3)), (100, (0, -86.0, 1.3)), (110, (0, -96.0, 1.3)), (120, (0, -106.0, 1.3)),
       (132, (0, -114.0, 1.0)), (142, tuple(DB + Vector((0, 0, 24.0)))), (150, tuple(ROOT_N + Vector((0, 0, 0.7)))),
       (158, tuple(HIT_BRANCH + Vector((0, 0, 0.7)))), (166, tuple(HIT_LEAF + Vector((0, 0, 0.7)))), (176, tuple(REC_POS[1] + Vector((0, 0.5, 0)))),
       (186, tuple(REC_POS[1] + Vector((0, 2.0, 1.5)))), (204, tuple(DB + Vector((0, 1.0, 12.0)))), (222, tuple(DB + Vector((0, 0.5, 21.0)))),
       (239, tuple(DB + Vector((0, 0.0, 27.5))))]
CAM = [(0, (0.35, EDGE_Y + 2.3, 1.9)), (12, (0.08, EDGE_Y + 1.2, 1.55)), (20, (-0.02, EDGE_Y + 0.5, 1.38)), (24, (-0.03, EDGE_Y + 0.12, 1.35)),
       (25, (0.0, 9.0, 1.9)), (34, (0.0, 4.6, 2.0)), (48, (0.8, -12.5, 2.2)), (62, (-0.6, -32.0, 2.4)), (72, (5.5, -45.0, 5.5)),
       (82, (1.2, -58.5, 2.6)), (92, (-0.8, -71.0, 2.4)), (100, (0.6, -79.0, 2.4)), (110, (-0.6, -89.0, 2.4)), (120, (0.4, -99.0, 2.5)),
       (132, (0.0, -107.0, 3.2)), (140, (0.0, -113.2, 2.6)), (146, (0.3, -115.4, -2.2)), (152, tuple(DB + Vector((4.5, 6.0, 23.0)))),
       (158, tuple(DB + Vector((5.0, 7.5, 16.0)))),
       (166, tuple(DB + Vector((3.5, 7.0, 9.5)))), (176, tuple(DB + Vector((1.5, 6.5, 6.0)))), (186, tuple(DB + Vector((0.0, 8.0, 5.5)))),
       (204, tuple(DB + Vector((0.0, 7.5, 7.0)))), (222, tuple(DB + Vector((0.0, 5.5, 14.0)))), (239, tuple(DB + Vector((0.0, 3.8, 21.5))))]
TGT = [(0, (-0.03, EDGE_Y, 1.4)), (24, (-0.03, EDGE_Y - 0.4, 1.35)), (25, (0, 0.0, 1.8)), (62, (0, -46.0, 1.4)), (72, (0, -62.0, 0.8)),
       (82, (0, -70.0, 1.6)), (120, (0, -110.0, 1.4)), (132, (0, -116.0, 0.0)), (142, tuple(DB + Vector((0, 0, 20.0)))),
       (166, tuple(HIT_LEAF)), (176, tuple(REC_POS[1])), (186, tuple(REC_POS[1] + Vector((0, 2.0, 1.5)))), (204, tuple(DB + Vector((0, 1.0, 12.0)))),
       (239, tuple(DB + Vector((0, 0.0, 30.0))))]
CUT = 25        # the port flash hides the jump from the edge to the inside of the server

target = link(bpy.data.objects.new("Camera target", None))
cam_data = bpy.data.cameras.new("Camera")
if VARIANT == "mobile":
    cam_data.sensor_fit, cam_data.lens, cam_data.shift_y = "VERTICAL", 17, -0.12
else:
    cam_data.sensor_fit, cam_data.lens = "HORIZONTAL", 26
cam_data.clip_start, cam_data.clip_end = 0.01, 600
cam_data.dof.use_dof = True
cam_data.dof.aperture_fstop = 4.0
camera = link(bpy.data.objects.new("Camera", cam_data))
scene.camera = camera
trk = camera.constraints.new("TRACK_TO")
trk.target, trk.track_axis, trk.up_axis = target, "TRACK_NEGATIVE_Z", "UP_Y"
followed = link(bpy.data.objects.new("Followed", None))
cam_data.dof.focus_object = followed

port_strength = port_glow.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
entry_strength = entry_glow.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
record_strength = M["record"].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
aperture_strength = aperture.data.materials[0].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]


def seg_keys(keys, f):
    """Interpolate within the side of the cut that f belongs to (no smoothing across the cut)."""
    side = [k for k in keys if (k[0] < CUT) == (f < CUT)]
    return keyed(side, f)


for f in range(N_FRAMES):
    p = seg_keys(ART, f)
    for sock in CLOCKS:
        sock.default_value = float(f)
        sock.keyframe_insert("default_value", frame=f)
    camera.location = seg_keys(CAM, f)
    target.location = seg_keys(TGT, f)
    if VARIANT == "mobile":   # portrait: step back for the record and the JSON card so they fit the narrow frame
        k_back = ss(166, 182, f)
        camera.location = target.location + (camera.location - target.location) * (1.0 + 0.65 * k_back)
    followed.location = p
    for o, prop in ((camera, "location"), (target, "location"), (followed, "location")):
        o.keyframe_insert(prop, frame=f)
    k_pulse = 1.0 - ss(126, 132, f)
    k_query = ss(126, 132, f) * (1.0 - ss(176, 184, f))
    k_json = ss(178, 188, f)
    pulse_o.location = p
    kp = max(k_pulse, 0.001) * (0.22 if f < CUT else 1.0)
    pulse_o.scale = (kp, 2.6 * kp, kp)
    ahead = seg_keys(ART, min(N_FRAMES - 1, f + 2)) - p
    pulse_o.rotation_euler = (0, 0, math.atan2(-ahead.x, ahead.y) if ahead.length > 1e-4 else 0)
    query_o.location = p
    query_o.rotation_euler = (0, 0, f * 0.08)
    query_o.scale = (max(k_query, 0.001),) * 3
    json_card.location = p
    json_card.rotation_euler = (math.radians(-60) * ss(204, 236, f), 0, 0)
    json_card.scale = (max(k_json, 0.001),) * 3
    for o in (pulse_o, query_o, json_card):
        for prop in ("location", "rotation_euler", "scale"):
            o.keyframe_insert(prop, frame=f)
    pulse_light.location = p
    pulse_light.data.energy = (12.0 if f < CUT else 120.0) * (k_pulse + k_query) + 40.0 * k_json
    pulse_light.data.color = RT_CYAN if f < 176 else (1.0, 0.8, 0.5)
    pulse_light.keyframe_insert("location", frame=f)
    pulse_light.data.keyframe_insert("energy", frame=f)
    pulse_light.data.keyframe_insert("color", frame=f)
    port_strength.default_value = 2.0 + 60.0 * ss(14, 24, f) * (1.0 if f < CUT else 0.0)
    port_strength.keyframe_insert("default_value", frame=f)
    entry_strength.default_value = 30.0 * (1.0 - ss(25, 29, f)) if f >= CUT else 0.0
    entry_glow.scale = (1.0, 1.0, 1.0) if CUT <= f <= 29 else (0.001, 0.001, 0.001)   # a light curtain only during the flash
    entry_glow.keyframe_insert("scale", frame=f)
    entry_strength.keyframe_insert("default_value", frame=f)
    record_strength.default_value = 14.0 * ss(164, 172, f)
    record_strength.keyframe_insert("default_value", frame=f)
    aperture_strength.default_value = 9.0 * ss(184, 214, f)
    aperture.scale = (1.0, 1.0, 1.0) if f >= 184 else (0.001, 0.001, 0.001)   # not in the way of the descent
    aperture.keyframe_insert("scale", frame=f)
    aperture_strength.keyframe_insert("default_value", frame=f)
    rec_objs[1].location = REC_POS[1] + Vector((0, 0.9 * ss(168, 180, f), 0))
    rec_objs[1].keyframe_insert("location", frame=f)
    cam_data.dof.aperture_fstop = 2.8 if f < CUT else 5.6
    cam_data.dof.keyframe_insert("aperture_fstop", frame=f)

# ----------------------------------------------------------------------------------------------
# Compositor (same grade as the pipeline): mist haze + restrained bloom.
# ----------------------------------------------------------------------------------------------
scene.use_nodes = True
tree = scene.node_tree
try:
    for n in list(tree.nodes):
        tree.nodes.remove(n)
    rl = tree.nodes.new("CompositorNodeRLayers")
    comp_out = tree.nodes.new("CompositorNodeComposite")
    haze = tree.nodes.new("CompositorNodeMixRGB")
    haze.inputs[2].default_value = (0.05, 0.07, 0.1, 1)
    mist_amt = tree.nodes.new("CompositorNodeMath")
    mist_amt.operation = "MULTIPLY"
    mist_amt.inputs[1].default_value = 0.25
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
    tree.links.new(haze.outputs[0], glare.inputs[0])
    tree.links.new(glare.outputs[0], comp_out.inputs[0])
except Exception as exc:
    print("Compositor fallback:", exc)


def export_path():
    out_dir = os.path.join(ROOT, "public", "cinematic", "runtime", VARIANT)
    os.makedirs(out_dir, exist_ok=True)
    rows = []
    for f in range(N_FRAMES):
        scene.frame_set(f)
        co = world_to_camera_view(scene, camera, followed.matrix_world.translation.copy())
        visible = 1 if (0 <= co.x <= 1 and 0 <= co.y <= 1 and co.z > 0) else 0
        rows.append([round(co.x, 4), round(1 - co.y, 4), round(co.z, 3), visible, 0.0])
    meta = {"frames": N_FRAMES, "tStart": T_START, "tEnd": T_END, "width": scene.render.resolution_x,
            "height": scene.render.resolution_y, "packet": rows,
            "beats": {"edge": [0, 24], "middleware": [25, 62], "routing": [62, 82], "controller": [82, 118],
                      "efcore": [118, 132], "database": [132, 184], "response": [184, N_FRAMES - 1]},
            "generator": GENERATOR, "blender": bpy.app.version_string}
    with open(os.path.join(out_dir, "packet.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, separators=(",", ":"))
    print("Runtime path written:", out_dir)


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
