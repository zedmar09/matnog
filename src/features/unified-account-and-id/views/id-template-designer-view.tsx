"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Barcode,
  Box,
  CreditCard,
  Eye,
  EyeOff,
  Heart,
  ImageIcon,
  Layers3,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Signature,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";

import { ContentPanel } from "@/shared/components/content-panel";
import { EmptyState } from "@/shared/components/empty-state";
import { FormField } from "@/shared/components/form-field";
import { PermissionState } from "@/shared/components/permission-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { useWorkspaceSession } from "@/shared/providers/workspace-session-provider";

import { IdCardCanvas } from "../components/identity-operations-ui";
import { identityOperationsRepository as repository } from "../services/identity-operations-repository";
import type { IdElementType, IdTemplateElement } from "../types/identity-operations";

const tools: { type: IdElementType; label: string; icon: typeof Type; content: string }[] = [
  { type: "text", label: "Text", icon: Type, content: "NEW TEXT" },
  { type: "photo", label: "Photo", icon: ImageIcon, content: "MR" },
  { type: "qr", label: "QR code", icon: QrCode, content: "MATNOG-VERIFY" },
  { type: "signature", label: "Signature", icon: Signature, content: "Signature" },
  { type: "logo", label: "Logo", icon: Heart, content: "♥" },
  { type: "shape", label: "Shape", icon: Box, content: "" },
  { type: "barcode", label: "Barcode", icon: Barcode, content: "MID20260001" },
];

export function IdTemplateDesignerView({ templateId }: { templateId: string }) {
  const { role } = useWorkspaceSession();
  const template = repository.findTemplate(templateId);
  const [elements, setElements] = useState<IdTemplateElement[]>(() => template?.elements ?? []);
  const [side, setSide] = useState<"front" | "back">("front");
  const [selectedId, setSelectedId] = useState<string>();
  const [undoStack, setUndoStack] = useState<IdTemplateElement[][]>([]);
  const [notice, setNotice] = useState("");
  const hostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; clientX: number; clientY: number; x: number; y: number } | undefined>(undefined);
  const selected = useMemo(() => elements.find((item) => item.id === selectedId), [elements, selectedId]);
  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = dragRef.current;
      const canvas = hostRef.current?.querySelector<HTMLElement>(".identity-card-canvas");
      if (!drag || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(96, drag.x + ((event.clientX - drag.clientX) / rect.width) * 100));
      const y = Math.max(0, Math.min(96, drag.y + ((event.clientY - drag.clientY) / rect.height) * 100));
      setElements((current) =>
        current.map((item) =>
          item.id === drag.id ? { ...item, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) } : item,
        ),
      );
    };
    const up = () => {
      dragRef.current = undefined;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);
  if (role !== "municipal")
    return (
      <PermissionState
        title="ID designer requires municipal access"
        description="Authorized municipal staff can manage credential layouts and template versions."
      />
    );
  if (!template)
    return (
      <EmptyState
        icon={CreditCard}
        headingLevel="h1"
        title="ID template unavailable"
        description="The requested template could not be found."
        action={
          <Button asChild variant="outline">
            <Link href="/ops/identity/templates">Return to templates</Link>
          </Button>
        }
      />
    );
  const snapshot = () => setUndoStack((current) => [...current.slice(-19), structuredClone(elements)]);
  const update = (changes: Partial<IdTemplateElement>) => {
    if (!selectedId) return;
    snapshot();
    setElements((current) => current.map((item) => (item.id === selectedId ? { ...item, ...changes } : item)));
  };
  const add = (type: IdElementType, content: string) => {
    snapshot();
    const id = `${side}-${type}-${Date.now()}`;
    const item: IdTemplateElement = {
      id,
      type,
      label: `New ${type}`,
      content,
      side,
      x: 10,
      y: 10,
      width: type === "photo" ? 22 : type === "shape" ? 35 : 25,
      height: type === "photo" ? 45 : type === "shape" ? 15 : 10,
      fontSize: 11,
      fontWeight: 600,
      color: "#153a2b",
      align: "left",
      background: type === "shape" ? template.secondaryColor : "transparent",
      radius: type === "photo" ? 8 : 0,
      visible: true,
    };
    setElements((current) => [...current, item]);
    setSelectedId(id);
  };
  const remove = () => {
    if (!selectedId) return;
    snapshot();
    setElements((current) => current.filter((item) => item.id !== selectedId));
    setSelectedId(undefined);
  };
  return (
    <div className="identity-designer-page">
      <div className="ops-topline">
        <div>
          <Link className="ops-back-link" href={`/ops/identity/templates/${template.id}`}>
            <ArrowLeft size={15} /> Templates
          </Link>
          <h1>ID designer</h1>
          <p>
            {template.name} · Version {template.version} · Drag any visible layer directly on the card.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!undoStack.length}
            onClick={() => {
              const previous = undoStack.at(-1);
              if (!previous) return;
              setElements(previous);
              setUndoStack((current) => current.slice(0, -1));
            }}
          >
            <Undo2 /> Undo
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setElements(repository.findTemplate(template.id)?.elements ?? []);
              setSelectedId(undefined);
              setUndoStack([]);
              setNotice("The saved layout was restored.");
            }}
          >
            <RotateCcw /> Reset
          </Button>
          <Button
            onClick={() => {
              const saved = repository.saveTemplateDesign(template.id, elements);
              if (saved) setNotice(`Version ${saved.version} was saved.`);
            }}
          >
            <Save /> Save version
          </Button>
        </div>
      </div>
      {notice && (
        <div className="registry-save-notice mb-5" role="status">
          {notice}
        </div>
      )}
      <div className="identity-designer-layout">
        <ContentPanel as="aside" className="identity-designer-tools">
          <div className="flex items-center gap-2">
            <Plus className="text-primary" />
            <div>
              <span className="eyebrow">Add layer</span>
              <h2>Elements</h2>
            </div>
          </div>
          <div className="identity-tool-grid">
            {tools.map((tool) => (
              <Button key={tool.type} variant="outline" onClick={() => add(tool.type, tool.content)}>
                <tool.icon />
                {tool.label}
              </Button>
            ))}
          </div>
          <div className="mt-5 border-t pt-5">
            <div className="flex items-center gap-2">
              <Layers3 className="text-primary" size={18} />
              <strong>Layers</strong>
            </div>
            <div className="identity-layer-list">
              {elements
                .filter((item) => item.side === side)
                .map((item) => (
                  <button
                    type="button"
                    className={selectedId === item.id ? "is-active" : ""}
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span>{item.label}</span>
                    {item.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                ))}
            </div>
          </div>
        </ContentPanel>
        <section className="identity-designer-stage">
          <fieldset className="identity-side-switch">
            <legend className="sr-only">Card side</legend>
            <Button
              variant={side === "front" ? "default" : "outline"}
              onClick={() => {
                setSide("front");
                setSelectedId(undefined);
              }}
            >
              Front
            </Button>
            <Button
              variant={side === "back" ? "default" : "outline"}
              onClick={() => {
                setSide("back");
                setSelectedId(undefined);
              }}
            >
              Back
            </Button>
          </fieldset>
          <div className="identity-card-workbench" ref={hostRef}>
            <IdCardCanvas
              elements={elements}
              side={side}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onPointerDown={(event, element) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                if (selectedId !== element.id) setSelectedId(element.id);
                setUndoStack((current) => [...current.slice(-19), structuredClone(elements)]);
                dragRef.current = {
                  id: element.id,
                  clientX: event.clientX,
                  clientY: event.clientY,
                  x: element.x,
                  y: element.y,
                };
              }}
            />
            <div className="identity-safe-zone" aria-hidden="true" />
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-muted-foreground text-xs">
            <span>
              <i className="inline-block size-2 rounded-full bg-primary" /> CR80 card ratio
            </span>
            <span>Safe-zone guides enabled</span>
            <span>{elements.filter((item) => item.side === side).length} layers</span>
          </div>
        </section>
        <ContentPanel as="aside" className="identity-properties-panel">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="eyebrow">Selected layer</span>
              <h2>Properties</h2>
            </div>
            {selected && (
              <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete selected layer">
                <Trash2 />
              </Button>
            )}
          </div>
          {selected ? (
            <div className="identity-properties">
              <FormField id="designer-label" label="Layer name">
                {(p) => <Input {...p} value={selected.label} onChange={(e) => update({ label: e.target.value })} />}
              </FormField>
              {!["photo", "shape", "logo"].includes(selected.type) && (
                <FormField id="designer-content" label="Content">
                  {(p) => (
                    <Input {...p} value={selected.content} onChange={(e) => update({ content: e.target.value })} />
                  )}
                </FormField>
              )}
              <div className="grid grid-cols-2 gap-3">
                <FormField id="designer-x" label="X position">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      min="0"
                      max="100"
                      value={selected.x}
                      onChange={(e) => update({ x: Number(e.target.value) })}
                    />
                  )}
                </FormField>
                <FormField id="designer-y" label="Y position">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      min="0"
                      max="100"
                      value={selected.y}
                      onChange={(e) => update({ y: Number(e.target.value) })}
                    />
                  )}
                </FormField>
                <FormField id="designer-width" label="Width">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      min="1"
                      max="100"
                      value={selected.width}
                      onChange={(e) => update({ width: Number(e.target.value) })}
                    />
                  )}
                </FormField>
                <FormField id="designer-height" label="Height">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      min="1"
                      max="100"
                      value={selected.height}
                      onChange={(e) => update({ height: Number(e.target.value) })}
                    />
                  )}
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField id="designer-font" label="Font size">
                  {(p) => (
                    <Input
                      {...p}
                      type="number"
                      min="6"
                      max="36"
                      value={selected.fontSize}
                      onChange={(e) => update({ fontSize: Number(e.target.value) })}
                    />
                  )}
                </FormField>
                <FormField id="designer-weight" label="Weight">
                  {(p) => (
                    <NativeSelect
                      {...p}
                      value={String(selected.fontWeight)}
                      onChange={(e) => update({ fontWeight: Number(e.target.value) })}
                    >
                      <option value="400">Regular</option>
                      <option value="500">Medium</option>
                      <option value="600">Semibold</option>
                      <option value="700">Bold</option>
                    </NativeSelect>
                  )}
                </FormField>
                <FormField id="designer-color" label="Text color">
                  {(p) => (
                    <Input
                      {...p}
                      type="color"
                      value={selected.color}
                      onChange={(e) => update({ color: e.target.value })}
                    />
                  )}
                </FormField>
                <FormField id="designer-background" label="Background">
                  {(p) => (
                    <Input
                      {...p}
                      type="color"
                      value={selected.background === "transparent" ? "#ffffff" : selected.background}
                      onChange={(e) => update({ background: e.target.value })}
                    />
                  )}
                </FormField>
              </div>
              <div>
                <span className="form-label">Alignment</span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={selected.align === "left" ? "default" : "outline"}
                    onClick={() => update({ align: "left" })}
                  >
                    <AlignLeft />
                  </Button>
                  <Button
                    type="button"
                    variant={selected.align === "center" ? "default" : "outline"}
                    onClick={() => update({ align: "center" })}
                  >
                    <AlignCenter />
                  </Button>
                  <Button
                    type="button"
                    variant={selected.align === "right" ? "default" : "outline"}
                    onClick={() => update({ align: "right" })}
                  >
                    <AlignRight />
                  </Button>
                </div>
              </div>
              <Button variant="outline" onClick={() => update({ visible: !selected.visible })}>
                {selected.visible ? <EyeOff /> : <Eye />}
                {selected.visible ? "Hide layer" : "Show layer"}
              </Button>
            </div>
          ) : (
            <div className="identity-properties-empty">
              <CreditCard />
              <strong>Select a layer</strong>
              <p>Choose a layer from the card or layer list to edit its content and position.</p>
            </div>
          )}
        </ContentPanel>
      </div>
      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <span className="eyebrow">Front reference</span>
          <IdCardCanvas elements={elements} side="front" className="mt-3" />
        </div>
        <div>
          <span className="eyebrow">Back reference</span>
          <IdCardCanvas elements={elements} side="back" className="mt-3" />
        </div>
      </section>
    </div>
  );
}
