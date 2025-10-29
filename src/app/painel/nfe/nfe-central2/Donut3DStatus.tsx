"use client";

import React, { useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

// --- CONSTANTES DO GRÁFICO ---
const INNER_RADIUS = 0.8;
const OUTER_RADIUS = 1.6;
const DEPTH = 0.2;

// --- COMPONENTE DE FATIA (Slice) ---
const Slice = ({
    name, startAngle, endAngle, color,
    isActive, isHovered, onClick, onHover
}: {
    name: string; startAngle: number; endAngle: number; color: string;
    isActive: boolean; isHovered: boolean;
    onClick: (name: string) => void; onHover: (name: string | null) => void;
}) => {
    const meshRef = useRef<THREE.Mesh>(null!);

    // Geometria
    const geometry = useMemo(() => {
        const shape = new THREE.Shape();
        shape.moveTo(INNER_RADIUS * Math.cos(startAngle), INNER_RADIUS * Math.sin(startAngle));
        shape.absarc(0, 0, OUTER_RADIUS, startAngle, endAngle, false);
        shape.lineTo(INNER_RADIUS * Math.cos(endAngle), INNER_RADIUS * Math.sin(endAngle));
        shape.absarc(0, 0, INNER_RADIUS, endAngle, startAngle, true);
        const extrudeSettings = { depth: DEPTH, bevelEnabled: false };
        // Limpa geometria anterior antes de criar nova - boa prática
        geometry?.dispose();
        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }, [startAngle, endAngle]); // Adiciona dependência geometry para limpeza correta

    // Animação
    useFrame(() => {
        if (!meshRef.current) return;
        const targetZ = isActive ? DEPTH * 0.4 : isHovered ? DEPTH * 0.2 : 0;
        const targetScale = isActive ? 1.08 : isHovered ? 1.04 : 1;
        meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, targetZ, 0.15);
        meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.15);
        meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScale, 0.15);
        meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale, 0.15);
    });

    // Render Mesh
    return (
        <mesh
            ref={meshRef} geometry={geometry} position-z={0}
            onClick={(e) => { e.stopPropagation(); onClick(name); }}
            onPointerOver={(e) => { e.stopPropagation(); onHover(name); }}
            onPointerOut={() => onHover(null)}
            castShadow receiveShadow
        >
            <meshStandardMaterial
                color={color}
                metalness={0.3}
                roughness={0.4}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
};

// --- COMPONENTE DO GRÁFICO (ChartGroup) ---
const ChartGroup = ({ angleData, activeStatus, hoveredStatus, onSliceClick, setHoveredStatus }: any) => {
    const groupRef = useRef<THREE.Group>(null!);
    const angleOffset = -Math.PI / 2;

    useFrame((state) => {
        if (groupRef.current) {
            const elapsedTime = state.clock.getElapsedTime();
            groupRef.current.rotation.z = angleOffset + Math.sin(elapsedTime * 0.4) * 0.05;
            groupRef.current.rotation.y = Math.cos(elapsedTime * 0.25) * 0.03;
        }
    });

    return (
        <group ref={groupRef} rotation-x={-Math.PI / 4.5} rotation-z={angleOffset}>
            {angleData.map((d: any) => (
                <Slice
                    key={d.name} name={d.name} startAngle={d.startAngle} endAngle={d.endAngle}
                    color={d.color}
                    isActive={activeStatus === d.name} isHovered={hoveredStatus === d.name}
                    onClick={onSliceClick} onHover={setHoveredStatus}
                />
            ))}
        </group>
    );
};

// --- COMPONENTE PRINCIPAL (Donut3DStatus) ---
interface DonutData { name: string; value: number; }
interface Donut3DStatusProps { data: DonutData[]; activeStatus: string; onSliceClick: (name: string) => void; colors: Record<string, string>; height: number; }

export default function Donut3DStatus({ data, activeStatus, onSliceClick, colors, height }: Donut3DStatusProps) {
    const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

    // Calcular ângulos com GAP
    const angleData = useMemo(() => {
        const totalValue = data.reduce((sum, d) => sum + d.value, 0);
        if (totalValue === 0) return [];
        let currentAngle = 0;
        const gap = 0.05;
        const totalGap = gap * data.length;
        const availableAngle = (2 * Math.PI) - totalGap;
        if (availableAngle <= 0) return [];
        return data.map(d => {
            const sliceRatio = d.value / totalValue;
            const sliceAngle = sliceRatio * availableAngle;
            const startAngle = currentAngle + gap / 2;
            const endAngle = startAngle + sliceAngle;
            currentAngle = endAngle + gap / 2;
            return { ...d, startAngle, endAngle, color: colors[d.name] || '#ccc' };
        });
    }, [data, colors]);

    // Renderizar Canvas e Legenda
    return (
        <div style={{ width: '100%', height: height, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, width: '100%', cursor: 'pointer', minHeight: 0 }}>
                {/* [MODIFICADO] Removida a key={Date.now()} */}
                <Canvas shadows camera={{ position: [0, 4, 4.5], fov: 50 }}>
                    <color attach="background" args={["#222730"]} />

                    {/* Luzes movidas para DENTRO do EffectComposer */}
                    {/* Chão invisível movido para DENTRO do EffectComposer */}
                    {/* ChartGroup movido para DENTRO do EffectComposer */}

                    {/* [MODIFICADO] EffectComposer agora envolve os elementos da cena */}
                    <EffectComposer>
                        {/* Iluminação */}
                        <ambientLight intensity={0.7} />
                        <directionalLight
                            position={[5, 8, 5]}
                            intensity={2.5}
                            castShadow
                            shadow-mapSize-width={1024}
                            shadow-mapSize-height={1024}
                            shadow-camera-far={25}
                            shadow-camera-left={-10}
                            shadow-camera-right={10}
                            shadow-camera-top={10}
                            shadow-camera-bottom={-10}
                            shadow-bias={-0.002}
                        />

                        {/* Conteúdo da Cena */}
                        <ChartGroup angleData={angleData} activeStatus={activeStatus} hoveredStatus={hoveredStatus} onSliceClick={onSliceClick} setHoveredStatus={setHoveredStatus} />

                        {/* Chão invisível */}
                        <mesh rotation-x={-Math.PI / 2} position-y={-OUTER_RADIUS * 0.5} receiveShadow>
                            <planeGeometry args={[15, 15]} />
                            <shadowMaterial opacity={0.3} />
                        </mesh>

                        {/* Efeito Bloom aplicado a tudo que está "dentro" do Composer */}
                        <Bloom
                            intensity={0.4}
                            luminanceThreshold={0.3}
                            luminanceSmoothing={0.3}
                            height={300}
                        />
                    </EffectComposer>
                </Canvas>
            </div>
            {/* Legenda HTML */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 12px', padding: '0 8px' }}>
                {data.map(d => (
                    <div key={d.name} onClick={() => onSliceClick(d.name)} onMouseEnter={() => setHoveredStatus(d.name)} onMouseLeave={() => setHoveredStatus(null)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s ease', opacity: (activeStatus === 'Todos' || activeStatus === d.name || hoveredStatus === d.name) ? 1 : 0.6, fontWeight: (activeStatus === d.name || hoveredStatus === d.name) ? 'bold' : 'normal' }}>
                        <span style={{ width: '10px', height: '10px', backgroundColor: colors[d.name] || '#ccc', borderRadius: '2px', border: '1px solid rgba(0,0,0,0.1)' }} />
                        <span style={{ color: '#E1E1E1' }}>{d.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}