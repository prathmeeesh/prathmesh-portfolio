"use client";
import { useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { useMotionPreference } from "./MotionProvider";

// Original decorative illustration; real HTML links provide accessible navigation.
const stations = [
  { id: "projects", label: "Selected work", x: 53, y: 22, number: "01" },
  { id: "skills", label: "Engineering", x: 77, y: 56, number: "02" },
  { id: "experience", label: "Experience", x: 25, y: 71, number: "03" },
];
export default function Observatory() {
  const canvas = useRef(null),
    pointer = useRef({ x: 0, y: 0 }),
    selected = useRef(null);
  const { paused } = useMotionPreference();
  useEffect(() => {
    const element = canvas.current,
      context = element?.getContext("2d");
    if (!context) return;
    let frame = 0,
      visible = true,
      width = 0,
      height = 0,
      last = 0;
    const draw = (time = 0) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.8);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.translate(
        width / 2 + (paused ? 0 : pointer.current.x * 7),
        height * 0.52 + (paused ? 0 : pointer.current.y * 5),
      );
      context.scale(width / 700, width / 700);
      const iso = (x, y, z = 0) => [(x - y) * 0.866, (x + y) * 0.42 - z];
      const path = (points, fill, stroke, glow = 0) => {
        context.beginPath();
        points.forEach(([x, y], i) =>
          i ? context.lineTo(x, y) : context.moveTo(x, y),
        );
        context.closePath();
        context.shadowBlur = glow;
        context.shadowColor = stroke || fill;
        if (fill) {
          context.fillStyle = fill;
          context.fill();
        }
        if (stroke) {
          context.strokeStyle = stroke;
          context.lineWidth = 0.8;
          context.stroke();
        }
        context.shadowBlur = 0;
      };
      const line = (a, b, color, w = 1) => {
        context.beginPath();
        context.moveTo(...a);
        context.lineTo(...b);
        context.strokeStyle = color;
        context.lineWidth = w;
        context.stroke();
      };
      const cube = (x, y, w, d, h, accent = "#7df9e8") => {
        path(
          [iso(x, y, 0), iso(x + w, y, 0), iso(x + w, y, h), iso(x, y, h)],
          "#101b24",
          "#283c4a",
        );
        path(
          [
            iso(x + w, y, 0),
            iso(x + w, y + d, 0),
            iso(x + w, y + d, h),
            iso(x + w, y, h),
          ],
          "#070e16",
          "#273545",
        );
        path(
          [
            iso(x, y, h),
            iso(x + w, y, h),
            iso(x + w, y + d, h),
            iso(x, y + d, h),
          ],
          "#233845",
          accent,
        );
      };
      for (let n = -440; n <= 440; n += 44) {
        line(iso(n, -440), iso(n, 440), "#18242e");
        line(iso(-440, n), iso(440, n), "#18242e");
        for (let m = -440; m <= 440; m += 88) {
          const [x, y] = iso(n, m);
          context.fillStyle = "#415260";
          context.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
        }
      }
      const routes = [
        [
          [0, 0],
          [-30, -30],
          [-30, -180],
          [-140, -180],
        ],
        [
          [0, 0],
          [190, 0],
          [190, -100],
        ],
        [
          [0, 0],
          [0, 180],
          [-160, 180],
        ],
      ];
      routes.forEach((route, index) => {
        for (let i = 1; i < route.length; i++)
          line(
            iso(...route[i - 1]),
            iso(...route[i]),
            selected.current === stations[index].id ? "#d7fff9" : "#539f9e",
            1.2,
          );
        if (!paused) {
          const step = ((time / 2700 + index / 3) % 1) * (route.length - 1),
            i = Math.floor(step),
            t = step - i;
          const a = iso(...route[i]),
            b = iso(...route[i + 1]);
          context.shadowBlur = 14;
          context.shadowColor = "#7df9e8";
          context.fillStyle = "#b0fff1";
          context.beginPath();
          context.arc(
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            2.3,
            0,
            Math.PI * 2,
          );
          context.fill();
          context.shadowBlur = 0;
        }
      });
      cube(-175, -215, 120, 95, 9, "#a497d5");
      for (let row = 0; row < 2; row++)
        for (let col = 0; col < 3; col++) {
          const x = -160 + col * 30,
            y = -202 + row * 35,
            h = 55 + col * 19 + row * 10;
          cube(x, y, 20, 24, h, "#678f9d");
          for (let k = 17; k < h - 4; k += 10)
            line(iso(x + 3, y, k), iso(x + 17, y, k), "#34505c", 2);
          line(iso(x + 5, y, h - 13), iso(x + 14, y, h - 13), "#8efce8", 3);
        }
      cube(155, -142, 90, 90, 9, "#9380c2");
      [20, 38, 56].forEach((z) => {
        path(
          [
            iso(166, -132, z),
            iso(232, -132, z),
            iso(232, -67, z),
            iso(166, -67, z),
          ],
          "#1b2039",
          "#b4a1ff",
        );
        line(iso(178, -120, z + 1), iso(218, -120, z + 1), "#d8ccff", 2);
      });
      cube(-200, 130, 125, 90, 9, "#6c9c8c");
      [0, 1, 2].forEach((i) =>
        cube(-183 + i * 31, 147, 24, 45, 27 + i * 20, "#7df9e8"),
      );
      cube(-48, -48, 96, 96, 12);
      cube(-37, -37, 74, 74, 25);
      path(
        [
          iso(-26, -26, 29),
          iso(26, -26, 29),
          iso(26, 26, 29),
          iso(-26, 26, 29),
        ],
        "#a9fff2",
        "#9ffff0",
        paused ? 8 : 16 + Math.sin(time / 1400) * 5,
      );
      for (let i = -35; i < 39; i += 9) {
        line(iso(i, -49, 12), iso(i, -60, 12), "#7d9d9a", 2);
        line(iso(49, i, 12), iso(60, i, 12), "#7d9d9a", 2);
      }
      const center = iso(0, 0, 31);
      context.fillStyle = "#104343";
      context.font = "bold 14px monospace";
      context.textAlign = "center";
      context.fillText("PP", center[0], center[1] + 5);
    };
    const tick = (time) => {
      if (!visible || document.hidden || paused) {
        frame = 0;
        return;
      }
      if (time - last > 32) {
        draw(time);
        last = time;
      }
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!frame && !paused && visible && !document.hidden)
        frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      ({ width, height } = element.getBoundingClientRect());
      const dpr = Math.min(window.devicePixelRatio || 1, 1.8);
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
      draw();
      start();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    visibility.observe(element);
    document.addEventListener("visibilitychange", start);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", start);
    };
  }, [paused]);
  return (
    <div
      className="observatory"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointer.current = {
          x: (event.clientX - rect.left) / rect.width - 0.5,
          y: (event.clientY - rect.top) / rect.height - 0.5,
        };
      }}
      onPointerLeave={() => {
        pointer.current = { x: 0, y: 0 };
        selected.current = null;
      }}
    >
      <div className="scene-caption mono">
        <span>+</span> THE ENGINEERING OBSERVATORY <span>+</span>
      </div>
      <canvas ref={canvas} aria-hidden="true" />
      <nav
        aria-label="Explore the engineering observatory"
        className="station-nav"
      >
        {stations.map((station) => (
          <a
            key={station.id}
            href={"#" + station.id}
            className={"station station-" + station.id}
            style={{ "--x": station.x + "%", "--y": station.y + "%" }}
            onFocus={() => {
              selected.current = station.id;
            }}
            onBlur={() => {
              selected.current = null;
            }}
            onPointerEnter={() => {
              selected.current = station.id;
            }}
          >
            <span className="mono">{station.number}</span> {station.label}{" "}
            <ArrowUpRight size={13} />
          </a>
        ))}
      </nav>
      <div className="scene-note mono">
        <span>Interactive map / select a station</span>
        <span>Built for the web</span>
      </div>
    </div>
  );
}
