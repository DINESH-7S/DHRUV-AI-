"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { ShaderMaterial, SRGBColorSpace, TextureLoader, Vector2 } from 'three';
import { subsolarPoint } from '@/lib/live/sun';

export interface GlobePoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
  /** Draw a text label (off for stations whose labels would collide). */
  label: boolean;
  /** Draw a route from NCPOR Goa and a pulsing ring (active stations). */
  active: boolean;
  /** Live air temperature for the marker, already formatted (e.g. "−14°C"). */
  temp?: string;
  /** Put the label on the left of the dot (neighbouring stations would collide). */
  labelLeft?: boolean;
}

export interface GlobeFocus {
  lat: number;
  lng: number;
  altitude: number;
}

interface GlobeCanvasProps {
  points: GlobePoint[];
  focus: GlobeFocus;
  onSelect: (id: string) => void;
  /** Label for NCPOR headquarters (localised by the caller). */
  hqLabel: string;
  /** Called once the globe has drawn, so the caller can remove its poster image. */
  onReady?: () => void;
}

/** NCPOR headquarters, Vasco da Gama, Goa: every expedition route starts here. */
const HQ = { lat: 15.39, lng: 73.83 };
const GLACIER = '#5bbfe6';

/*
 * Real day and night: the day (NASA Blue Marble) and night (city lights) textures are blended
 * along the actual terminator, from the sun's current position (lib/live/sun.ts). Normals are in
 * world space, so the lighting stays true wherever the camera is.
 */
const VERTEX = `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const FRAGMENT = `
  #define PI 3.141592653589793
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform vec2 sunPosition; // lng, lat
  varying vec3 vNormal;
  varying vec2 vUv;
  float toRad(float a) { return a * PI / 180.0; }
  vec3 polarToCartesian(vec2 c) {
    float theta = toRad(90.0 - c.x);
    float phi = toRad(90.0 - c.y);
    return vec3(sin(phi) * cos(theta), cos(phi), sin(phi) * sin(theta));
  }
  void main() {
    float intensity = dot(normalize(vNormal), normalize(polarToCartesian(sunPosition)));
    vec4 day = texture2D(dayTexture, vUv);
    vec4 night = texture2D(nightTexture, vUv);
    // A soft twilight band, and night lights slightly lifted so the dark side still reads.
    float blend = smoothstep(-0.12, 0.12, intensity);
    vec4 nightTinted = night * 1.25 + vec4(0.015, 0.03, 0.06, 0.0);
    gl_FragColor = mix(nightTinted, day, blend);
    #include <colorspace_fragment>
  }
`;

/** Station marker: name and live temperature in the site's type, clickable. */
function markerElement(p: GlobePoint, onSelect: (id: string) => void): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = p.labelLeft ? 'globe-marker globe-marker-left' : 'globe-marker';
  el.setAttribute('aria-label', p.temp ? `${p.name}, ${p.temp}` : p.name);
  el.innerHTML = `<span class="globe-marker-dot" style="--c:${p.color}"></span><span class="globe-marker-body"><span class="globe-marker-name"></span>${p.temp ? '<span class="globe-marker-temp"></span>' : ''}</span>`;
  el.querySelector('.globe-marker-name')!.textContent = p.name;
  if (p.temp) el.querySelector('.globe-marker-temp')!.textContent = p.temp;
  el.style.pointerEvents = 'auto';
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onSelect(p.id);
  });
  return el;
}

/**
 * Client-only globe, loaded via next/dynamic (it owns the ref because next/dynamic does not forward refs).
 * Performance: sized to its box, pixel ratio capped at 1.5, and the render loop pauses when the globe
 * is off-screen or the tab is hidden, so it costs nothing while you read the rest of the page.
 */
export default function GlobeCanvas({ points, focus, onSelect, hqLabel, onReady }: GlobeCanvasProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [ready, setReady] = useState(false);

  // Day/night material: textures load once; the sun moves every minute; everything is disposed on unmount.
  const material = useMemo(() => {
    const loader = new TextureLoader();
    const load = (url: string) => {
      const tex = loader.load(url);
      tex.colorSpace = SRGBColorSpace;
      return tex;
    };
    const sun = subsolarPoint();
    return new ShaderMaterial({
      uniforms: {
        dayTexture: { value: load('/globe/day-2048.webp') },
        nightTexture: { value: load('/globe/night-2048.webp') },
        sunPosition: { value: new Vector2(sun.lng, sun.lat) },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
    });
  }, []);
  useEffect(() => {
    const tick = () => {
      const sun = subsolarPoint();
      (material.uniforms.sunPosition.value as Vector2).set(sun.lng, sun.lat);
    };
    const id = window.setInterval(tick, 60_000);
    return () => {
      window.clearInterval(id);
      material.uniforms.dayTexture.value.dispose();
      material.uniforms.nightTexture.value.dispose();
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Pause rendering when not visible (scrolled away or background tab).
  useEffect(() => {
    if (!ready || !boxRef.current) return;
    const globe = globeRef.current;
    if (!globe) return;
    let onScreen = true;
    const sync = () => (onScreen && !document.hidden ? globe.resumeAnimation() : globe.pauseAnimation());
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    io.observe(boxRef.current);
    document.addEventListener('visibilitychange', sync);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const globe = globeRef.current;
    if (!globe) return;
    globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const controls = globe.controls();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom = false; // page scroll must not get trapped by the globe
    controls.enableDamping = true;
  }, [ready]);

  // Fly to the requested view once the globe exists, and whenever the focus changes.
  useEffect(() => {
    if (ready) globeRef.current?.pointOfView(focus, 1400);
  }, [ready, focus]);

  const active = useMemo(() => points.filter(p => p.active), [points]);
  const arcs = useMemo(
    () => active.map(p => ({ startLat: HQ.lat, startLng: HQ.lng, endLat: p.lat, endLng: p.lng })),
    [active],
  );
  const markers = useMemo(() => points.filter(p => p.label), [points]);
  const hq = useMemo(() => [{ id: 'hq', name: hqLabel, lat: HQ.lat, lng: HQ.lng, color: '#eef5fa', label: true, active: false }], [hqLabel]);

  return (
    <div ref={boxRef} className="absolute inset-0">
      {size.width > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          onGlobeReady={() => {
            setReady(true);
            // Give the earth texture a moment to decode before the poster fades out.
            setTimeout(() => onReady?.(), 350);
          }}
          backgroundColor="rgba(0,0,0,0)"
          globeMaterial={material}
          atmosphereColor={GLACIER}
          atmosphereAltitude={0.16}
          /* Stations: HTML markers with the live temperature; hidden while behind the globe */
          htmlElementsData={markers}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.02}
          htmlElement={p => markerElement(p as GlobePoint, onSelect)}
          htmlElementVisibilityModifier={(el, visible) => {
            el.style.opacity = visible ? '1' : '0';
            el.style.pointerEvents = visible ? 'auto' : 'none';
          }}
          /* NCPOR headquarters, where the routes start */
          labelsData={hq}
          labelLat="lat"
          labelLng="lng"
          labelText="name"
          labelSize={1.1}
          labelDotRadius={0.4}
          labelColor={() => 'rgba(242, 246, 250, 0.9)'}
          labelResolution={2}
          /* Expedition routes: animated dashes flowing from NCPOR Goa to each station */
          arcsData={arcs}
          arcColor={() => ['rgba(91,191,230,0.0)', 'rgba(91,191,230,0.9)']}
          arcStroke={0.35}
          arcAltitudeAutoScale={0.32}
          arcDashLength={0.45}
          arcDashGap={0.25}
          arcDashInitialGap={() => Math.random()}
          arcDashAnimateTime={2600}
          /* Pulsing rings on active stations */
          ringsData={active}
          ringLat="lat"
          ringLng="lng"
          ringColor={() => (t: number) => `rgba(91,191,230,${Math.max(0, 1 - t) * 0.8})`}
          ringMaxRadius={3.2}
          ringPropagationSpeed={1.6}
          ringRepeatPeriod={1400}
        />
      )}
    </div>
  );
}
