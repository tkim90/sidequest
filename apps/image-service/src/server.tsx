import { createServer, type IncomingMessage } from "node:http";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import React, { type ReactNode } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SpecElement {
  type: string;
  props?: Record<string, unknown>;
  children?: string[];
}

interface Spec {
  root: string;
  elements: Record<string, SpecElement>;
}

interface RenderRequest {
  spec: Spec;
  format?: "svg" | "png";
  width?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// Style helper – Satori crashes on explicit undefined style values
// ---------------------------------------------------------------------------

function clean(style: Record<string, unknown>): React.CSSProperties {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out as React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Satori-compatible components
// ---------------------------------------------------------------------------

function Frame(p: Record<string, unknown>) {
  return (
    <div
      style={clean({
        display: "flex",
        flexDirection: p.direction === "row" ? "row" : "column",
        width: "100%",
        height: "100%",
        background: (p.background as string) ?? "#ffffff",
        padding: (p.padding as number) ?? 40,
        gap: p.gap as number,
        alignItems: p.alignItems as string,
        justifyContent: p.justifyContent as string,
      })}
    >
      {p.children as ReactNode}
    </div>
  );
}

function Box(p: Record<string, unknown>) {
  return (
    <div
      style={clean({
        display: "flex",
        flexDirection: p.direction === "row" ? "row" : "column",
        padding: p.padding as number,
        margin: p.margin as number,
        background: p.background as string,
        borderRadius: p.borderRadius as number,
        border:
          p.borderWidth
            ? `${p.borderWidth}px solid ${(p.borderColor as string) ?? "#000"}`
            : undefined,
        gap: p.gap as number,
        alignItems: p.alignItems as string,
        justifyContent: p.justifyContent as string,
        position: p.position as string,
        top: p.top as number,
        right: p.right as number,
        bottom: p.bottom as number,
        left: p.left as number,
        width: p.width as number,
        height: p.height as number,
      })}
    >
      {p.children as ReactNode}
    </div>
  );
}

function Row(p: Record<string, unknown>) {
  return (
    <div
      style={clean({
        display: "flex",
        flexDirection: "row",
        gap: (p.gap as number) ?? 16,
        alignItems: p.alignItems as string,
        justifyContent: p.justifyContent as string,
        padding: p.padding as number,
      })}
    >
      {p.children as ReactNode}
    </div>
  );
}

function Column(p: Record<string, unknown>) {
  return (
    <div
      style={clean({
        display: "flex",
        flexDirection: "column",
        gap: (p.gap as number) ?? 16,
        alignItems: p.alignItems as string,
        justifyContent: p.justifyContent as string,
        padding: p.padding as number,
      })}
    >
      {p.children as ReactNode}
    </div>
  );
}

const HEADING_SIZES: Record<number, number> = { 1: 48, 2: 36, 3: 28, 4: 22 };

function Heading(p: Record<string, unknown>) {
  const level = (p.level as number) ?? 2;
  const hasChildren = p.children !== undefined && p.children !== null;
  return (
    <div
      style={clean({
        display: hasChildren ? "flex" : undefined,
        flexDirection: hasChildren ? "column" : undefined,
        fontSize: HEADING_SIZES[level] ?? 36,
        fontWeight: (p.fontWeight as number) ?? 700,
        color: (p.color as string) ?? "#000",
        lineHeight: 1.2,
      })}
    >
      {hasChildren ? (
        <>
          <div>{(p.text as string) ?? ""}</div>
          {p.children as ReactNode}
        </>
      ) : (
        (p.text as string) ?? ""
      )}
    </div>
  );
}

function Text(p: Record<string, unknown>) {
  const hasChildren = p.children !== undefined && p.children !== null;
  return (
    <div
      style={clean({
        display: hasChildren ? "flex" : undefined,
        flexDirection: hasChildren ? "column" : undefined,
        fontSize: (p.fontSize as number) ?? 16,
        fontWeight: p.fontWeight as number,
        color: (p.color as string) ?? "#000",
        lineHeight: (p.lineHeight as number) ?? 1.5,
      })}
    >
      {hasChildren ? (
        <>
          <div>{(p.content as string) ?? ""}</div>
          {p.children as ReactNode}
        </>
      ) : (
        (p.content as string) ?? ""
      )}
    </div>
  );
}

function ImageComp(p: Record<string, unknown>) {
  return (
    <img
      src={p.src as string}
      width={p.width as number}
      height={p.height as number}
      alt=""
      style={clean({
        borderRadius: p.borderRadius as number,
        objectFit: (p.objectFit as string) ?? "cover",
      })}
    />
  );
}

function Badge(p: Record<string, unknown>) {
  return (
    <div
      style={clean({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: (p.backgroundColor as string) ?? "#e4e4e7",
        color: (p.color as string) ?? "#18181b",
        fontSize: (p.fontSize as number) ?? 14,
        fontWeight: 600,
        padding: "4px 12px",
        borderRadius: (p.borderRadius as number) ?? 9999,
      })}
    >
      {(p.text as string) ?? ""}
    </div>
  );
}

function Divider(p: Record<string, unknown>) {
  return (
    <div
      style={clean({
        width: "100%",
        height: (p.thickness as number) ?? 1,
        backgroundColor: (p.color as string) ?? "#e4e4e7",
      })}
    />
  );
}

function Spacer(p: Record<string, unknown>) {
  return <div style={{ height: (p.size as number) ?? 16 }} />;
}

// ---------------------------------------------------------------------------
// Component registry
// ---------------------------------------------------------------------------

const COMPONENTS: Record<string, React.FC<Record<string, unknown>>> = {
  Frame,
  Box,
  Row,
  Column,
  Heading,
  Text,
  Image: ImageComp,
  Badge,
  Divider,
  Spacer,
};

// ---------------------------------------------------------------------------
// Build React element tree from spec
// ---------------------------------------------------------------------------

function buildElement(id: string, spec: Spec): ReactNode {
  const el = spec.elements[id];
  if (!el) return null;

  const Comp = COMPONENTS[el.type];
  if (!Comp) return null;

  const children = el.children
    ?.map((childId) => buildElement(childId, spec))
    .filter(Boolean);

  const props: Record<string, unknown> = { ...(el.props ?? {}), key: id };

  if (children && children.length > 0) {
    return <Comp {...props}>{children}</Comp>;
  }
  return <Comp {...props} />;
}

// ---------------------------------------------------------------------------
// Dimensions — pulled from Frame props or request override
// ---------------------------------------------------------------------------

function getDimensions(
  spec: Spec,
  reqWidth?: number,
  reqHeight?: number,
): { width: number; height: number } {
  if (reqWidth && reqHeight) return { width: reqWidth, height: reqHeight };
  const root = spec.elements[spec.root];
  return {
    width: reqWidth ?? (root?.props?.width as number) ?? 1200,
    height: reqHeight ?? (root?.props?.height as number) ?? 630,
  };
}

// ---------------------------------------------------------------------------
// Font loading — uses Geist Sans TTF from node_modules
// ---------------------------------------------------------------------------

let fontCache: ArrayBuffer | null = null;

async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const fontPath = join(
    __dirname,
    "..",
    "node_modules",
    "geist",
    "dist",
    "fonts",
    "geist-sans",
    "Geist-Regular.ttf",
  );
  const buf = await readFile(fontPath);
  fontCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return fontCache;
}

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

async function renderToSvg(
  spec: Spec,
  width: number,
  height: number,
): Promise<string> {
  const font = await loadFont();
  const element = buildElement(spec.root, spec);
  if (!element) throw new Error("Failed to build element tree");

  return satori(element as React.ReactElement, {
    width,
    height,
    fonts: [
      { name: "Geist Sans", data: font, weight: 400, style: "normal" as const },
    ],
  });
}

async function renderToPng(
  spec: Spec,
  width: number,
  height: number,
): Promise<Uint8Array> {
  const svg = await renderToSvg(spec, width, height);
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
  return resvg.render().asPng();
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString();
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== "/render") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  try {
    const body: RenderRequest = JSON.parse(await readBody(req));
    const { spec, format = "svg" } = body;
    const { width, height } = getDimensions(spec, body.width, body.height);

    if (format === "png") {
      const png = await renderToPng(spec, width, height);
      res.writeHead(200, { "Content-Type": "image/png" });
      res.end(Buffer.from(png));
    } else {
      const svg = await renderToSvg(spec, width, height);
      res.writeHead(200, { "Content-Type": "image/svg+xml" });
      res.end(svg);
    }
  } catch (err) {
    console.error("Render error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err) }));
  }
});

const PORT = Number(process.env.PORT ?? 3001);
server.listen(PORT, () => {
  console.log(`Image service running on http://localhost:${PORT}`);
});
