import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ConjunctionResult, VisualObject } from "../types";

interface OrbitSceneProps {
  results: ConjunctionResult[];
  selected: ConjunctionResult | null;
}

function hash(value: string): number {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function orbitPoint(radius: number, inclination: number, phase: number, theta: number): THREE.Vector3 {
  const x = radius * Math.cos(theta + phase);
  const y = radius * Math.sin(theta + phase) * Math.cos(inclination);
  const z = radius * Math.sin(theta + phase) * Math.sin(inclination);
  return new THREE.Vector3(x, y, z);
}

function createOrbit(radius: number, inclination: number, phase: number, color: number): THREE.Line {
  const points = Array.from({ length: 97 }, (_, index) => orbitPoint(radius, inclination, phase, (index / 96) * Math.PI * 2));
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 });
  return new THREE.LineLoop(geometry, material);
}

export default function OrbitScene({ results, selected }: OrbitSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const objects: VisualObject[] = results.flatMap((result) => [
    { name: result.object_a, catnr: result.catnr_a, riskLabel: result.risk_label, isSelected: selected?.catnr_a === result.catnr_a || selected?.catnr_b === result.catnr_a },
    { name: result.object_b, catnr: result.catnr_b, riskLabel: result.risk_label, isSelected: selected?.catnr_a === result.catnr_b || selected?.catnr_b === result.catnr_b },
  ]).filter((object, index, all) => all.findIndex((candidate) => candidate.catnr === object.catnr) === index);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050b18");
    scene.fog = new THREE.Fog("#050b18", 14, 25);
    const camera = new THREE.PerspectiveCamera(37, mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1, 100);
    camera.position.set(0, 2.2, 8.8);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x88aacc, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(4, 5, 6);
    scene.add(sun);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 48, 32),
      new THREE.MeshPhongMaterial({ color: 0x103a58, emissive: 0x061526, shininess: 18, specular: 0x4ccde9 }),
    );
    scene.add(earth);
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.62, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0x44c9e7, transparent: true, opacity: 0.08, side: THREE.BackSide }),
    );
    scene.add(atmosphere);

    const emptyObjects: VisualObject[] = [
      { name: "ISS (ZARYA)", catnr: "25544", riskLabel: "LOW" },
      { name: "HUBBLE", catnr: "20580", riskLabel: "LOW" },
      { name: "SENTINEL-2A", catnr: "40697", riskLabel: "LOW" },
    ];
    const displayObjects = objects.length ? objects : emptyObjects;
    const markerPositions = new Map<string, THREE.Vector3>();
    displayObjects.forEach((object, index) => {
      const seed = hash(object.catnr) + index * 17;
      const inclination = ((seed % 70) + 15) * (Math.PI / 180);
      const phase = ((seed * 13) % 360) * (Math.PI / 180);
      const radius = 2.02 + (seed % 5) * 0.12;
      const orbitColor = object.isSelected ? 0xf0a23b : 0x5be0e9;
      scene.add(createOrbit(radius, inclination, phase, orbitColor));
      const position = orbitPoint(radius, inclination, phase, ((seed * 7) % 360) * (Math.PI / 180));
      markerPositions.set(object.catnr, position);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(object.isSelected ? 0.11 : 0.065, 12, 8),
        new THREE.MeshBasicMaterial({ color: object.isSelected ? 0xf0a23b : 0xd9fbff }),
      );
      marker.position.copy(position);
      scene.add(marker);
    });

    if (selected) {
      const pointA = markerPositions.get(selected.catnr_a);
      const pointB = markerPositions.get(selected.catnr_b);
      if (pointA && pointB) {
        const geometry = new THREE.BufferGeometry().setFromPoints([pointA, pointB]);
        scene.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xf0a23b, linewidth: 2 })));
      }
    }

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(240 * 3);
    for (let index = 0; index < 240; index += 1) {
      starPositions[index * 3] = (hash(String(index)) % 20) - 10;
      starPositions[index * 3 + 1] = (hash(String(index * 3)) % 14) - 7;
      starPositions[index * 3 + 2] = -2 - (hash(String(index * 9)) % 12);
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb8eaf0, size: 0.025, transparent: true, opacity: 0.75 })));

    let animationFrame = 0;
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      earth.rotation.y += 0.0018;
      atmosphere.rotation.y -= 0.0008;
      scene.rotation.y = Math.sin(Date.now() * 0.0001) * 0.035;
      renderer.render(scene, camera);
    };
    animate();
    const handleResize = () => {
      camera.aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((node) => {
        if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.Points) {
          node.geometry.dispose();
          if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose());
          else node.material.dispose();
        }
      });
    };
  }, [objects, selected]);

  return <div className="orbit-scene" ref={mountRef} aria-label="Three-dimensional orbital visualization"><div className="scene-label">SGP4 VISUALIZATION / STATIC ORBITAL PROJECTION</div><div className="scene-scale">EARTH RADIUS 1.0× <span>◌</span> LEO FIELD</div>{selected && <div className="scene-selection">PAIR LINKED · {selected.risk_label}</div>}</div>;
}
