"use client";

import React, { useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, EffectComposer, Bloom, N8AO } from '@react-three/drei';

// --- CONSTANTES DO GRÁFICO ---
const INNER_RADIUS = 0.8; // Raio interno (cria o buraco do Donut)
const OUTER_RADIUS = 1.2; // Raio externo
const DEPTH = 0.3;        // Profundidade (extrusão)
const BEVEL_SIZE = 0.02;  // Tamanho da borda chanfrada

// --- COMPONENTE DE FATIA (Slice) ---
// Cada fatia é um mesh 3D individual
const Slice = ({
    name,
    startAngle,
    endAngle,
    color,
    isActive,
    isHovered,
    onClick,
    onHover
}: {
    name: string;
    startAngle: number;
    endAngle: number;
    color: string;
    isActive: boolean;
    isHovered: boolean;
    onClick: (name: string) => void;
    onHover: (name: string | null) => void;
}) => {
    const meshRef = useRef<THREE.Mesh>(null!);

    // 1. Criar a geometria da fatia (ExtrudeGeometry)
    // Usamos useMemo para evitar recalcular a geometria em cada renderização
    const geometry = useMemo(() => {
        const shape = new THREE.Shape();
        
        // Desenha o arco externo
        shape.moveTo(INNER_RADIUS * Math.cos(startAngle), INNER_RADIUS * Math.sin(startAngle));
        shape.absarc(0, 0, OUTER_RADIUS, startAngle, endAngle, false);
        
        // Desenha a linha de volta para o arco interno
        shape.lineTo(INNER_RADIUS * Math.cos(endAngle), INNER_RADIUS * Math.sin(endAngle));
        
        // Desenha o arco interno
        shape.absarc(0, 0, INNER_RADIUS, endAngle, startAngle, true);

        // Configurações da extrusão (profundidade e bordas)
        const extrudeSettings = {
            depth: DEPTH,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 1,
            bevelSize: BEVEL_SIZE,
            bevelThickness: BEVEL_SIZE,
        };

        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }, [startAngle, endAngle]);

    // 2. Animar a fatia (Hover/Active)
    // useFrame é um hook do r3f que roda a cada frame (60fps)
    useFrame(() => {
        if (!meshRef.current) return;

        // Define a posição Z (altura) e escala alvo
        const targetZ = isActive ? DEPTH / 1.5 : isHovered ? DEPTH / 3 : 0;
        const targetScale = isActive ? 1.05 : 1;

        // Anima suavemente (lerp) a posição Z
        meshRef.current.position.z = THREE.MathUtils.lerp(
            meshRef.current.position.z,
            targetZ,
            0.1 // Velocidade da animação
        );
        
        // Anima suavemente (lerp) a escala
        meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1);
        meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScale, 0.1);
        meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale, 0.1);
    });

    // 3. Renderizar o Mesh
    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            onClick={(e) => {
                e.stopPropagation();
                onClick(name);
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                onHover(name);
            }}
            onPointerOut={() => onHover(null)}
            castShadow // Faria precisa projetar sombra
            receiveShadow // Faria precisa receber sombra
        >
            <meshStandardMaterial
                color={color}
                metalness={0.1} // Leve reflexo
                roughness={0.8} // Pouco brilho
            />
        </mesh>
    );
};

// --- COMPONENTE PRINCIPAL (Donut3DStatus) ---
interface DonutData {
    name: string;
    value: number;
}

interface Donut3DStatusProps {
    data: DonutData[];
    activeStatus: string;
    onSliceClick: (name: string) => void;
    colors: Record<string, string>;
    height: number;
}

export default function Donut3DStatus({
    data,
    activeStatus,
    onSliceClick,
    colors,
    height
}: Donut3DStatusProps) {
    const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

    // 1. Calcular ângulos
    // Converte os dados (name, value) em ângulos (startAngle, endAngle)
    const angleData = useMemo(() => {
        const totalValue = data.reduce((sum, d) => sum + d.value, 0);
        if (totalValue === 0) return []; // Evita divisão por zero

        let currentAngle = 0;

        return data.map(d => {
            const sliceAngle = (d.value / totalValue) * (2 * Math.PI);
            const startAngle = currentAngle;
            const endAngle = currentAngle + sliceAngle;
            
            // Corrige o ângulo inicial para alinhar com o topo (gira -90 graus)
            const angleOffset = -Math.PI / 2;

            currentAngle = endAngle;

            return {
                ...d,
                startAngle: startAngle + angleOffset,
                endAngle: endAngle + angleOffset,
                color: colors[d.name] || '#ccc'
            };
        });
    }, [data, colors]);

    // 2. Renderizar o Canvas 3D e a Legenda HTML
    return (
        <div style={{ width: '100%', height: height, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            
            {/* 2.1. Canvas 3D */}
            <div style={{ flex: 1, width: '100%', cursor: 'pointer', minHeight: 0 }}>
                <Canvas
                    shadows // Habilita sombras
                    camera={{ position: [0, 2, 4.5], fov: 45 }} // Posição da câmera
                >
                    {/* Iluminação */}
                    <ambientLight intensity={0.5} />
                    <directionalLight
                        position={[5, 5, 5]}
                        intensity={1}
                        castShadow
                        shadow-mapSize-width={1024}
                        shadow-mapSize-height={1024}
                    />
                    
                    {/* Pós-processamento (brilho e oclusão) */}
                    <EffectComposer>
                        <N8AO quality="medium" aoRadius={0.5} intensity={1} />
                        <Bloom luminanceThreshold={1} intensity={0.1} mipmapBlur />
                    </EffectComposer>
                    
                    <Center>
                        <group rotation-x={-Math.PI / 5}> {/* Inclina o gráfico */}
                            {/* Renderiza todas as fatias */}
                            {angleData.map(d => (
                                <Slice
                                    key={d.name}
                                    name={d.name}
                                    startAngle={d.startAngle}
                                    endAngle={d.endAngle}
                                    color={d.color}
                                    isActive={activeStatus === d.name}
                                    isHovered={hoveredStatus === d.name}
                                    onClick={onSliceClick}
                                    onHover={setHoveredStatus}
                                />
                            ))}
                        </group>
                    </Center>
                    
                    {/* Um "chão" invisível para receber a sombra */}
                    <mesh rotation-x={-Math.PI / 2} position-z={-DEPTH / 2 - 0.01} receiveShadow>
                        <planeGeometry args={[10, 10]} />
                        <shadowMaterial opacity={0.1} />
                    </mesh>

                </Canvas>
            </div>

            {/* 2.2. Legenda HTML Interativa */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '8px 12px',
                padding: '0 8px'
            }}>
                {data.map(d => (
                    <div
                        key={d.name}
                        onClick={() => onSliceClick(d.name)}
                        onMouseEnter={() => setHoveredStatus(d.name)}
                        onMouseLeave={() => setHoveredStatus(null)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            // Destaca a legenda se estiver ativa ou com hover
                            opacity: (activeStatus === 'Todos' || activeStatus === d.name || hoveredStatus === d.name) ? 1 : 0.6,
                            fontWeight: (activeStatus === d.name || hoveredStatus === d.name) ? 'bold' : 'normal'
                        }}
                    >
                        <span style={{
                            width: '10px',
                            height: '10px',
                            backgroundColor: colors[d.name] || '#ccc',
                            borderRadius: '2px',
                            border: '1px solid rgba(0,0,0,0.1)'
                        }} />
                        <span>{d.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
