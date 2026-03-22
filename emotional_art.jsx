import { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_PARAMS = {
  palette: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#1e1b4b"],
  bgColor: "#0a0a1a",
  particleCount: 180,
  speed: 0.6,
  waveAmplitude: 80,
  waveFrequency: 0.012,
  turbulence: 0.3,
  connectionDistance: 120,
  particleSize: 2.2,
  pulseRate: 0.02,
  spiralStrength: 0.15,
  colorShift: 0.001,
  opacity: 0.75,
  mood: "serene",
  description: "A calm, flowing cosmos"
};

function lerp(a, b, t) { return a + (b - a) * t; }
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

export default function EmotionalArt() {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const animRef = useRef(null);
  const [feeling, setFeeling] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState("serene");
  const [description, setDescription] = useState("A calm, flowing cosmos");
  const [showInput, setShowInput] = useState(false);
  const paramsRef = useRef({ ...DEFAULT_PARAMS });
  const targetParamsRef = useRef({ ...DEFAULT_PARAMS });

  const initParticles = useCallback((canvas, params) => {
    const particles = [];
    for (let i = 0; i < params.particleCount; i++) {
      const colorIdx = Math.floor(Math.random() * (params.palette.length - 1));
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * params.speed,
        vy: (Math.random() - 0.5) * params.speed,
        size: params.particleSize * (0.5 + Math.random()),
        colorIdx,
        phase: Math.random() * Math.PI * 2,
        life: Math.random(),
        trail: [],
      });
    }
    return particles;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const state = stateRef.current;
    const params = paramsRef.current;
    const target = targetParamsRef.current;

    // Smoothly lerp params toward target
    const lerpSpeed = 0.02;
    params.speed = lerp(params.speed, target.speed, lerpSpeed);
    params.waveAmplitude = lerp(params.waveAmplitude, target.waveAmplitude, lerpSpeed);
    params.waveFrequency = lerp(params.waveFrequency, target.waveFrequency, lerpSpeed);
    params.turbulence = lerp(params.turbulence, target.turbulence, lerpSpeed);
    params.connectionDistance = lerp(params.connectionDistance, target.connectionDistance, lerpSpeed);
    params.particleSize = lerp(params.particleSize, target.particleSize, lerpSpeed);
    params.pulseRate = lerp(params.pulseRate, target.pulseRate, lerpSpeed);
    params.spiralStrength = lerp(params.spiralStrength, target.spiralStrength, lerpSpeed);
    params.opacity = lerp(params.opacity, target.opacity, lerpSpeed);

    // Lerp bg color
    const bg = hexToRgb(params.bgColor);
    const targetBg = hexToRgb(target.bgColor);
    params.bgColor = "#" + [0,1,2].map(i => {
      const v = Math.round(lerp(bg[i], targetBg[i], lerpSpeed));
      return v.toString(16).padStart(2,"0");
    }).join("");

    state.time += 0.016;

    // Fade background with slight trail
    const bgRgb = hexToRgb(params.bgColor);
    ctx.fillStyle = `rgba(${bgRgb[0]},${bgRgb[1]},${bgRgb[2]},0.18)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Draw connections
    for (let i = 0; i < state.particles.length; i++) {
      for (let j = i + 1; j < state.particles.length; j++) {
        const p1 = state.particles[i], p2 = state.particles[j];
        const dx = p1.x - p2.x, dy = p1.y - p2.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < params.connectionDistance) {
          const alpha = (1 - dist / params.connectionDistance) * 0.35 * params.opacity;
          const rgb = hexToRgb(target.palette[Math.min(p1.colorIdx, target.palette.length - 2)]);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    // Update & draw particles
    state.particles.forEach((p, idx) => {
      p.phase += params.pulseRate;

      // Wave flow field
      const wave = Math.sin(p.x * params.waveFrequency + state.time) * params.waveAmplitude * 0.01;
      const wave2 = Math.cos(p.y * params.waveFrequency * 0.7 + state.time * 0.8) * params.waveAmplitude * 0.01;

      // Spiral/vortex
      const dx = p.x - cx, dy = p.y - cy;
      const angle = Math.atan2(dy, dx);
      const dist = Math.sqrt(dx*dx + dy*dy);
      const spiralX = -Math.sin(angle) * params.spiralStrength * (dist / (canvas.width * 0.5));
      const spiralY = Math.cos(angle) * params.spiralStrength * (dist / (canvas.width * 0.5));

      // Turbulence
      const turbX = (Math.sin(p.x * 0.008 + state.time * 1.3) + Math.sin(p.y * 0.006 + state.time)) * params.turbulence * 0.5;
      const turbY = (Math.cos(p.y * 0.008 + state.time * 0.9) + Math.cos(p.x * 0.005 + state.time * 1.1)) * params.turbulence * 0.5;

      p.vx += wave + spiralX + turbX;
      p.vy += wave2 + spiralY + turbY;

      const maxSpeed = params.speed * 3;
      const spd = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
      if (spd > maxSpeed) { p.vx = (p.vx/spd)*maxSpeed; p.vy = (p.vy/spd)*maxSpeed; }

      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;

      // Wrap edges
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      // Reassign color index if palette changed
      if (p.colorIdx >= target.palette.length - 1) {
        p.colorIdx = Math.floor(Math.random() * (target.palette.length - 1));
      }

      const pulse = 0.7 + 0.3 * Math.sin(p.phase);
      const size = params.particleSize * pulse * (0.7 + 0.6 * p.life);
      const rgb = hexToRgb(target.palette[p.colorIdx]);
      const alpha = params.opacity * pulse * 0.9;

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
      ctx.fill();

      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.15})`;
      ctx.fill();
    });

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = DEFAULT_PARAMS.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stateRef.current = { time: 0, particles: initParticles(canvas, DEFAULT_PARAMS) };
    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [draw, initParticles]);

  const analyzeFeeling = async () => {
    if (!feeling.trim()) return;
    setLoading(true);
    setShowInput(false);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          system: `You are an AI that converts human emotions into precise visual parameters for a particle system art generator. The art uses flowing particles with wave motion, vortex spirals, and glowing connections. Always respond with ONLY valid JSON, no preamble, no markdown.`,
          messages: [{
            role: "user",
            content: `The human feels: "${feeling}"

Return ONLY a JSON object with these exact keys. Be creative and emotionally expressive:
{
  "palette": ["#hex1","#hex2","#hex3","#hex4","#hex5"],
  "bgColor": "#hex (dark background matching mood)",
  "particleCount": (100-400, int),
  "speed": (0.1-3.0, float — slow for calm, fast for excited/anxious),
  "waveAmplitude": (20-200, float — gentle ripples to violent waves),
  "waveFrequency": (0.004-0.04, float — slow drift to rapid oscillation),
  "turbulence": (0.05-2.5, float — smooth to chaotic),
  "connectionDistance": (60-200, float — sparse to densely connected),
  "particleSize": (1.0-5.0, float),
  "pulseRate": (0.005-0.08, float — heartbeat speed of pulsing),
  "spiralStrength": (0.0-0.8, float — 0=linear flow, high=vortex),
  "opacity": (0.3-1.0, float),
  "mood": "one word label",
  "description": "one poetic sentence about what this looks like"
}

Emotion→visual mapping guidance:
- Joy/Happy: warm golds/yellows/orange, fast particles, high connections, low turbulence, moderate spiral
- Sad/Melancholy: deep blues/indigo/slate, slow particles, low connections, gentle waves, low turbulence
- Anxious/Nervous: reds/oranges/sharp yellows, fast speed, HIGH turbulence, rapid pulse, many particles
- Calm/Peaceful: teals/mint/soft blue, very slow, large amplitude gentle waves, low turbulence, low pulse
- Angry: deep reds/crimson/dark orange, very fast, max turbulence, violent waves, strong spiral
- Love/Romantic: pinks/roses/magentas/warm purples, moderate speed, high connections, gentle pulsing
- Excited: bright multi-color palette, fast, many particles, moderate turbulence, rapid pulse
- Lonely: single muted color family, sparse particles, very low connection distance, slow drift
- Awe/Wonder: deep purples/cosmic blues/starlight, moderate speed, strong spiral, low turbulence, starfield feel
- Nostalgic: warm amber/sepia tones, slow, gentle waves, soft opacity
Adapt creatively for nuanced feelings.`
          }]
        })
      });

      const data = await response.json();
      const text = data.content.map(c => c.text || "").join("");
      const cleaned = text.replace(/```json|```/g, "").trim();
      const newParams = JSON.parse(cleaned);

      targetParamsRef.current = { ...DEFAULT_PARAMS, ...newParams };
      setCurrentMood(newParams.mood || feeling);
      setDescription(newParams.description || "");

      // Reinitialize particles with new count if drastically different
      const canvas = canvasRef.current;
      if (Math.abs(newParams.particleCount - stateRef.current.particles.length) > 50) {
        stateRef.current.particles = initParticles(canvas, newParams);
      }

    } catch (err) {
      console.error("API error:", err);
      setDescription("The cosmos felt your feeling...");
    }

    setLoading(false);
    setFeeling("");
  };

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", fontFamily: "var(--font-sans, system-ui)" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <canvas ref={canvasRef} style={{ display: "block", position: "absolute", inset: 0 }} />

      {/* Title + mood label top left */}
      <div style={{ position: "absolute", top: 24, left: 28, pointerEvents: "none" }}>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 300, marginBottom: 4 }}>
          The feeling machine
        </div>
        <div style={{
          color: "rgba(255,255,255,0.4)", fontSize: 12, letterSpacing: "0.12em",
          textTransform: "uppercase"
        }}>
          {loading ? "reading your feeling..." : currentMood}
        </div>
      </div>

      {/* Description */}
      {description && (
        <div style={{
          position: "absolute", bottom: 90, left: "50%", transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center",
          maxWidth: 400, lineHeight: 1.6, pointerEvents: "none",
          transition: "opacity 0.8s ease"
        }}>
          {description}
        </div>
      )}

      {/* Input area */}
      {showInput ? (
        <div style={{
          position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: 8, alignItems: "center",
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)",
          border: "0.5px solid rgba(255,255,255,0.15)",
          borderRadius: 40, padding: "8px 8px 8px 20px",
          width: "min(640px, 90vw)"
        }}>
          <input
            autoFocus
            value={feeling}
            onChange={e => setFeeling(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") analyzeFeeling(); if (e.key === "Escape") setShowInput(false); }}
            placeholder="How are you feeling right now?"
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "rgba(255,255,255,0.9)", fontSize: 14, caretColor: "white"
            }}
          />
          <button
            onClick={analyzeFeeling}
            disabled={!feeling.trim() || loading}
            style={{
              background: loading ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)",
              border: "0.5px solid rgba(255,255,255,0.2)",
              borderRadius: 30, padding: "7px 18px",
              color: "rgba(255,255,255,0.8)", fontSize: 14, cursor: loading ? "default" : "pointer",
              transition: "all 0.2s", display: "flex", alignItems: "center", gap: 7,
              whiteSpace: "nowrap"
            }}
          >
            {loading && (
              <span style={{
                display: "inline-block", width: 12, height: 12,
                border: "1.5px solid rgba(255,255,255,0.25)",
                borderTopColor: "rgba(255,255,255,0.8)",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite"
              }} />
            )}
            {loading ? "Updating..." : "Update →"}
          </button>
          <button
            onClick={() => setShowInput(false)}
            style={{
              background: "transparent", border: "none",
              color: "rgba(255,255,255,0.35)", fontSize: 18, cursor: "pointer", padding: "0 6px"
            }}
          >×</button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          style={{
            position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
            border: "0.5px solid rgba(255,255,255,0.18)",
            borderRadius: 30, padding: "10px 28px",
            color: "rgba(255,255,255,0.6)", fontSize: 13,
            cursor: "pointer", letterSpacing: "0.06em",
            transition: "all 0.25s"
          }}
          onMouseEnter={e => e.target.style.color = "rgba(255,255,255,0.9)"}
          onMouseLeave={e => e.target.style.color = "rgba(255,255,255,0.6)"}
        >
          how are you feeling?
        </button>
      )}
    </div>
  );
}
