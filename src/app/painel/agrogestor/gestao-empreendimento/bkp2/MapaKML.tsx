// MapaKML.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Polygon, Polyline, Marker } from "@react-google-maps/api";
import { kml as kmlToGeoJson } from "@tmcw/togeojson";
import { Spin } from "antd";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

const containerStyle = { width: "100%", height: "400px", borderRadius: "8px" };
const center = { lat: -15.77972, lng: -47.92972 };

interface MapaKMLProps {
  urlKML: string;
}

/* ======================= Utils: encoding, ZIP, cor KML ======================= */
const decodeBestEffort = (buffer: ArrayBuffer): string => {
  try {
    const utf8 = new TextDecoder("utf-8").decode(buffer);
    if (!utf8.includes("\uFFFD")) return utf8;
  } catch {}
  return new TextDecoder("iso-8859-1").decode(buffer);
};

const isZip = (buf: ArrayBuffer) => {
  if (buf.byteLength < 4) return false;
  const v = new Uint8Array(buf.slice(0, 4));
  return v[0] === 0x50 && v[1] === 0x4b && v[2] === 0x03 && v[3] === 0x04;
};

/** KML usa aabbggrr (ARGB invertido). Retorna color CSS (rgb) e opacidade [0..1]. */
const kmlColorToRgba = (aabbggrr?: string) => {
  if (!aabbggrr || !/^[0-9a-fA-F]{8}$/.test(aabbggrr)) return { colorCss: "#000000", opacity: 1 };
  const aa = parseInt(aabbggrr.slice(0, 2), 16);
  const bb = parseInt(aabbggrr.slice(2, 4), 16);
  const gg = parseInt(aabbggrr.slice(4, 6), 16);
  const rr = parseInt(aabbggrr.slice(6, 8), 16);
  const opacity = aa / 255;
  const colorCss = `rgb(${rr}, ${gg}, ${bb})`;
  return { colorCss, opacity };
};

/* ======================= Tipos de estilo ======================= */
type PolyStyle = {
  colorCss?: string;
  fillOpacity?: number;
  outline?: boolean; // false => strokeWeight 0
  fill?: boolean; // false => fillOpacity 0
};

type LineStyle = {
  colorCss?: string;
  strokeOpacity?: number;
  width?: number;
};

type IconStyle = {
  href?: string;
  scale?: number;
};

type LabelStyle = {
  colorCss?: string;
  opacity?: number;
  scale?: number;
};

type StyleDef = {
  poly?: PolyStyle;
  line?: LineStyle;
  icon?: IconStyle;
  label?: LabelStyle;
};

type StyleCatalog = {
  styles: Record<string, StyleDef>;
  styleMaps: Record<string, string>;
  resolveAsset?: (href: string) => string | undefined;
};

/* ======================= Catálogo de estilos do XML KML ======================= */
const buildStyleCatalog = (doc: Document, resolveAsset?: (href: string) => string | undefined): StyleCatalog => {
  const styles: Record<string, StyleDef> = {};
  const styleMaps: Record<string, string> = {};

  const styleNodes = Array.from(doc.getElementsByTagName("Style"));
  for (const s of styleNodes) {
    const id = s.getAttribute("id");
    if (!id) continue;
    const styleId = `#${id}`;
    const def: StyleDef = {};

    // PolyStyle
    const polyNode = s.getElementsByTagName("PolyStyle")[0];
    if (polyNode) {
      const colorNode = polyNode.getElementsByTagName("color")[0]?.textContent?.trim();
      const fillNode = polyNode.getElementsByTagName("fill")[0]?.textContent?.trim();
      const outlineNode = polyNode.getElementsByTagName("outline")[0]?.textContent?.trim();
      const poly: PolyStyle = {};
      if (colorNode) {
        const { colorCss, opacity } = kmlColorToRgba(colorNode);
        poly.colorCss = colorCss;
        poly.fillOpacity = opacity;
      }
      if (fillNode !== undefined) poly.fill = fillNode !== "0";
      if (outlineNode !== undefined) poly.outline = outlineNode !== "0";
      def.poly = poly;
    }

    // LineStyle
    const lineNode = s.getElementsByTagName("LineStyle")[0];
    if (lineNode) {
      const colorNode = lineNode.getElementsByTagName("color")[0]?.textContent?.trim();
      const widthNode = lineNode.getElementsByTagName("width")[0]?.textContent?.trim();
      const line: LineStyle = {};
      if (colorNode) {
        const { colorCss, opacity } = kmlColorToRgba(colorNode);
        line.colorCss = colorCss;
        line.strokeOpacity = opacity;
      }
      if (widthNode) {
        const w = parseFloat(widthNode);
        if (!isNaN(w)) line.width = w;
      }
      def.line = line;
    }

    // IconStyle
    const iconNode = s.getElementsByTagName("IconStyle")[0];
    if (iconNode) {
      const scaleNode = iconNode.getElementsByTagName("scale")[0]?.textContent?.trim();
      const hrefNode = iconNode.getElementsByTagName("Icon")[0]?.getElementsByTagName("href")[0]?.textContent?.trim();
      const icon: IconStyle = {};
      if (scaleNode) {
        const k = parseFloat(scaleNode);
        if (!isNaN(k)) icon.scale = k;
      }
      if (hrefNode) {
        icon.href = resolveAsset ? resolveAsset(hrefNode) || hrefNode : hrefNode;
      }
      def.icon = icon;
    }

    // LabelStyle
    const lblNode = s.getElementsByTagName("LabelStyle")[0];
    if (lblNode) {
      const colorNode = lblNode.getElementsByTagName("color")[0]?.textContent?.trim();
      const scaleNode = lblNode.getElementsByTagName("scale")[0]?.textContent?.trim();
      const label: LabelStyle = {};
      if (colorNode) {
        const { colorCss, opacity } = kmlColorToRgba(colorNode);
        label.colorCss = colorCss;
        label.opacity = opacity;
      }
      if (scaleNode) {
        const k = parseFloat(scaleNode);
        if (!isNaN(k)) label.scale = k;
      }
      def.label = label;
    }

    styles[styleId] = def;
  }

  const styleMapNodes = Array.from(doc.getElementsByTagName("StyleMap"));
  for (const sm of styleMapNodes) {
    const id = sm.getAttribute("id");
    if (!id) continue;
    const mapId = `#${id}`;
    const pairs = Array.from(sm.getElementsByTagName("Pair"));
    let normalUrl: string | undefined;
    for (const p of pairs) {
      const key = p.getElementsByTagName("key")[0]?.textContent?.trim();
      const url = p.getElementsByTagName("styleUrl")[0]?.textContent?.trim();
      if (key === "normal" && url) {
        normalUrl = url;
        break;
      }
    }
    if (normalUrl) styleMaps[mapId] = normalUrl;
  }

  return { styles, styleMaps, resolveAsset };
};

const resolveStyleUrl = (url: string | undefined, catalog: StyleCatalog): StyleDef | undefined => {
  if (!url) return undefined;
  const mapped = catalog.styleMaps[url];
  const finalUrl = mapped || url;
  return catalog.styles[finalUrl];
};

/* ======================= Tipos de render ======================= */
type PolyFeat = { paths: google.maps.LatLngLiteral[][]; options: google.maps.PolygonOptions };
type LineFeat = { path: google.maps.LatLngLiteral[]; options: google.maps.PolylineOptions };
type PointFeat = {
  position: google.maps.LatLngLiteral;
  icon?: google.maps.Icon | string;
  label?: google.maps.MarkerLabel;
  zIndex?: number;
};

/* ===== estilos "uniformes" (para KML puro) ===== */
const UNIFORM_POLYGON: google.maps.PolygonOptions = {
  fillColor: "#007bff",
  fillOpacity: 0.30,
  strokeColor: "#007bff",
  strokeOpacity: 1,
  strokeWeight: 2,
  clickable: false,
  draggable: false,
  editable: false,
  geodesic: false,
  zIndex: 1,
};

const UNIFORM_LINE: google.maps.PolylineOptions = {
  strokeColor: "#007bff",
  strokeOpacity: 1,
  strokeWeight: 2,
  clickable: false,
  draggable: false,
  editable: false,
  geodesic: false,
  zIndex: 2,
};

/* ===== estilos default (quando KMZ respeitando styles do arquivo) ===== */
const defaultPolyOptionsKMZ: google.maps.PolygonOptions = { ...UNIFORM_POLYGON };
const defaultLineOptionsKMZ: google.maps.PolylineOptions = { ...UNIFORM_LINE };

/** Constrói opções para polígono respeitando estilo do KML (usado no KMZ) */
const makePolygonOptionsKMZ = (style?: StyleDef): google.maps.PolygonOptions => {
  const opt: google.maps.PolygonOptions = { ...defaultPolyOptionsKMZ };
  if (!style) return opt;

  if (style.poly?.colorCss) opt.fillColor = style.poly.colorCss;
  if (style.poly?.fillOpacity !== undefined) opt.fillOpacity = style.poly.fillOpacity;
  if (style.poly?.fill === false) opt.fillOpacity = 0;

  if (style.poly?.outline === false) {
    opt.strokeWeight = 0;
  } else if (style.line?.width !== undefined) {
    opt.strokeWeight = Math.max(0, Math.round(style.line.width));
  }

  if (style.line?.colorCss) opt.strokeColor = style.line.colorCss;
  if (style.line?.strokeOpacity !== undefined) opt.strokeOpacity = style.line.strokeOpacity;
  
  if (!style.line && style.poly?.colorCss) {
    opt.strokeColor = style.poly.colorCss;
    if (style.poly.fillOpacity != null) opt.strokeOpacity = style.poly.fillOpacity;
  }

  return opt;
};

const makePolylineOptionsKMZ = (style?: StyleDef): google.maps.PolylineOptions => {
  const opt: google.maps.PolylineOptions = { ...defaultLineOptionsKMZ };
  if (!style) return opt;
  if (style.line?.colorCss) opt.strokeColor = style.line.colorCss;
  if (style.line?.strokeOpacity !== undefined) opt.strokeOpacity = style.line.strokeOpacity;
  if (style.line?.width !== undefined) opt.strokeWeight = Math.max(1, Math.round(style.line.width));
  return opt;
};

/** Constrói ícone do Marker a partir de IconStyle (suporte básico a scale) */
const makeMarkerIcon = (icon?: IconStyle): google.maps.Icon | string | undefined => {
  if (!icon?.href) return undefined;
  if (!icon.scale) return icon.href; // usa tamanho nativo
  const base = 32;
  const size = Math.max(8, Math.round(base * icon.scale));
  return { url: icon.href, scaledSize: new google.maps.Size(size, size) };
};

/** Converte cor rgb() para rgba() com opacidade */
const toRgba = (rgbCss: string, alpha?: number) => {
    if (alpha == null || alpha === 1) return rgbCss;
    return rgbCss.replace(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/, (_,r,g,b) => `rgba(${r}, ${g}, ${b}, ${alpha})`);
}

/** Constrói label do Marker a partir de LabelStyle + nome */
const makeMarkerLabel = (name: string | undefined, label?: LabelStyle): google.maps.MarkerLabel | undefined => {
  if (!name) return undefined;
  const ml: google.maps.MarkerLabel = { text: name };
  if (label?.colorCss) {
    ml.color = toRgba(label.colorCss, label.opacity);
  }
  if (label?.scale) {
    const px = Math.round(12 * Math.max(0.8, Math.min(2.5, label.scale)));
    (ml as any).fontSize = `${px}px`;
  }
  return ml;
};

const MapaKML: React.FC<MapaKMLProps> = ({ urlKML }) => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [polygons, setPolygons] = useState<PolyFeat[]>([]);
  const [polylines, setPolylines] = useState<LineFeat[]>([]);
  const [points, setPoints] = useState<PointFeat[]>([]);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]); // para revogar blobs de assets do KMZ
  const zoomListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  /** Resolve ícones internos do KMZ para blob: URL */
  const buildKmzAssetResolver = async (zip: JSZip) => {
    const urlMap: Record<string, string> = {};
    const entries = Object.values(zip.files).filter((f) => !f.dir && !f.name.toLowerCase().endsWith(".kml"));

    for (const e of entries) {
      const blob = await e.async("blob");
      const url = URL.createObjectURL(blob);
      objectUrlsRef.current.push(url);

      const keyExact = e.name.replace(/\\/g, "/");
      const keyLower = keyExact.toLowerCase();
      const base = keyExact.split("/").pop() || keyExact;

      urlMap[keyExact] = url;
      urlMap[keyLower] = url;
      urlMap[base] = url;
      urlMap[base.toLowerCase()] = url;
    }

    return (href: string) => {
        if (!href) return undefined;
        try {
            const norm = decodeURIComponent(href).replace(/\\/g, '/').replace(/^\.\//, '');
            const short = norm.split('/').pop()!;
            return urlMap[norm] || urlMap[norm.toLowerCase()] || urlMap[short] || urlMap[short.toLowerCase()];
        } catch {
            return undefined; // URI malformada
        }
    };
  };

  /** Extrai features estilizadas de UM documento KML */
  const parseStyledFromKmlDoc = (
    doc: Document,
    resolver: ((href: string) => string | undefined) | undefined,
    forceUniform: boolean
  ) => {
    const catalog = buildStyleCatalog(doc, resolver);
    const geoJson = kmlToGeoJson(doc);

    const p: PolyFeat[] = [];
    const l: LineFeat[] = [];
    const pts: PointFeat[] = [];

    if (!geoJson || !geoJson.features) return { p, l, pts };

    for (const feature of geoJson.features) {
      const geom = feature?.geometry;
      if (!geom || !geom.type || !geom.coordinates) continue;

      const styleUrl: string | undefined = feature?.properties?.styleUrl;
      const kmlStyle = forceUniform ? undefined : resolveStyleUrl(styleUrl, catalog);
      const name: string | undefined = feature?.properties?.name;

      if (geom.type === "Polygon") {
        const rings = geom.coordinates as number[][][];
        if (Array.isArray(rings) && rings.length > 0) {
          const paths: google.maps.LatLngLiteral[][] = [];
          for (let i = 0; i < rings.length; i++) {
            const ring = rings[i];
            const ringPath = ring.map(([lng, lat]) => ({ lat, lng }));
            if (ringPath.length) paths.push(ringPath);
          }
          p.push({
            paths,
            options: forceUniform ? { ...UNIFORM_POLYGON } : makePolygonOptionsKMZ(kmlStyle),
          });
        }
      } else if (geom.type === "MultiPolygon") {
        const multi = geom.coordinates as number[][][][];
        for (const poly of multi) {
          if (Array.isArray(poly) && poly.length > 0) {
            const paths: google.maps.LatLngLiteral[][] = [];
            for (let i = 0; i < poly.length; i++) {
              const ring = poly[i];
              const ringPath = ring.map(([lng, lat]) => ({ lat, lng }));
              if (ringPath.length) paths.push(ringPath);
            }
            p.push({
              paths,
              options: forceUniform ? { ...UNIFORM_POLYGON } : makePolygonOptionsKMZ(kmlStyle),
            });
          }
        }
      } else if (geom.type === "LineString") {
        const coords = geom.coordinates as number[][];
        const path = coords.map(([lng, lat]) => ({ lat, lng }));
        if (path.length > 0) {
          l.push({
            path,
            options: forceUniform ? { ...UNIFORM_LINE } : makePolylineOptionsKMZ(kmlStyle),
          });
        }
      } else if (geom.type === "MultiLineString") {
        const multi = geom.coordinates as number[][][];
        for (const seg of multi) {
          const path = seg.map(([lng, lat]) => ({ lat, lng }));
          if (path.length > 0) {
            l.push({
              path,
              options: forceUniform ? { ...UNIFORM_LINE } : makePolylineOptionsKMZ(kmlStyle),
            });
          }
        }
      } else if (geom.type === "Point") {
        const [lng, lat] = geom.coordinates as number[];
        const position = { lat, lng };

        if (forceUniform) {
          pts.push({
            position,
            icon: undefined,
            label: name ? { text: name } : undefined,
            zIndex: 3,
          });
        } else {
          const icon = makeMarkerIcon(kmlStyle?.icon);
          const label = makeMarkerLabel(name, kmlStyle?.label);
          pts.push({ position, icon, label, zIndex: 3 });
        }
      }
    }

    return { p, l, pts };
  };

  useEffect(() => {
    if (!urlKML || !map) return;

    const fetchAndProcess = async () => {
      try {
        setErrMsg(null);
        objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
        objectUrlsRef.current = [];
        zoomListenerRef.current?.remove();
        zoomListenerRef.current = null;

        const response = await fetch(urlKML);
        if (!response.ok) throw new Error("Falha ao buscar o arquivo.");
        const buf = await response.arrayBuffer();

        const polys: PolyFeat[] = [];
        const lines: LineFeat[] = [];
        const pointsAcc: PointFeat[] = [];
        const bounds = new window.google.maps.LatLngBounds();

        if (isZip(buf)) {
          const zip = await JSZip.loadAsync(buf);
          const resolveAsset = await buildKmzAssetResolver(zip);
          const entries = Object.values(zip.files).filter(
            (f) => !f.dir && f.name.toLowerCase().endsWith(".kml")
          );
          if (entries.length === 0) throw new Error("Nenhum arquivo .kml encontrado dentro do KMZ.");

          for (const e of entries) {
            const kmlBuf = await e.async("arraybuffer");
            const text = decodeBestEffort(kmlBuf);
            const doc = new DOMParser().parseFromString(text, "text/xml");
            const errorNode = doc.getElementsByTagName("parsererror");
            if (errorNode.length > 0) {
              console.error("Erro de Parser:", errorNode[0].textContent);
              continue;
            }
            const { p, l, pts } = parseStyledFromKmlDoc(doc, resolveAsset, false);
            polys.push(...p);
            lines.push(...l);
            pointsAcc.push(...pts);
          }
        } else {
          const text = decodeBestEffort(buf);
          const doc = new DOMParser().parseFromString(text, "text/xml");
          const errorNode = doc.getElementsByTagName("parsererror");
          if (errorNode.length > 0) {
            console.error("Erro de Parser:", errorNode[0].textContent);
            throw new Error("Arquivo KML inválido ou mal-formado.");
          }
          const { p, l, pts } = parseStyledFromKmlDoc(doc, undefined, true);
          polys.push(...p);
          lines.push(...l);
          pointsAcc.push(...pts);
        }

        if (polys.length === 0 && lines.length === 0 && pointsAcc.length === 0) {
          throw new Error("Nenhuma geometria encontrada para exibir.");
        }

        setPolygons(polys);
        setPolylines(lines);
        setPoints(pointsAcc);

        polys.forEach((feat) => feat.paths.forEach(ring => ring.forEach(pt => bounds.extend(pt))));
        lines.forEach((feat) => feat.path.forEach(pt => bounds.extend(pt)));
        pointsAcc.forEach((feat) => bounds.extend(feat.position));

        if (!bounds.isEmpty()) {
            map.fitBounds(bounds);
            const totalFeatures = polys.length + lines.length + pointsAcc.length;
            if (totalFeatures === 1 && pointsAcc.length === 1) { // Apenas um ponto
                zoomListenerRef.current = google.maps.event.addListenerOnce(map, 'idle', () => {
                    const currentZoom = map.getZoom();
                    if (currentZoom) {
                        map.setZoom(Math.min(currentZoom, 16));
                    }
                });
            }
        }
      } catch (err: any) {
        setErrMsg(err?.message ?? 'Falha ao processar o arquivo KML/KMZ.');
        setPolygons([]);
        setPolylines([]);
        setPoints([]);
      }
    };

    fetchAndProcess();

    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
      zoomListenerRef.current?.remove();
      zoomListenerRef.current = null;
    };
  }, [urlKML, map]);

  const onMapLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const onMapUnmount = useCallback(() => setMap(null), []);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
      return <div>Chave de API do Google Maps não configurada.</div>;
  }
  if (loadError) return <div>Erro ao carregar o mapa. Verifique a chave de API.</div>;
  if (!isLoaded)
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
        <Spin />
      </div>
    );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={4}
            onLoad={onMapLoad}
            onUnmount={onMapUnmount}
            options={{ mapTypeControl: true, streetViewControl: false, fullscreenControl: false }}
        >
            {polygons.map((feat, idx) => (
                <Polygon key={`poly-${idx}`} paths={feat.paths} options={feat.options} />
            ))}
            {polylines.map((feat, idx) => (
                <Polyline key={`line-${idx}`} path={feat.path} options={feat.options} />
            ))}
            {points.map((pt, idx) => (
                <Marker key={`pt-${idx}`} position={pt.position} icon={pt.icon} label={pt.label} zIndex={pt.zIndex} />
            ))}
        </GoogleMap>
        {errMsg && (
            <div style={{
                position: 'absolute', top: 8, left: 8, right: 8, bottom: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '1rem',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                color: '#d9534f',
                fontWeight: 'bold'
            }}>
                {errMsg}
            </div>
        )}
    </div>
  );
};

export default MapaKML;