"use client";

import * as React from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { cn } from "@/shared/lib/utils";

/** Radix reserves the empty string, so an "any" option is carried as a token. */
const EMPTY = "__empty__";

type NativeSelectProps = Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default";
};

type Option = { value: string; label: string; disabled?: boolean };

/** Reads `<option>` / `<optgroup>` children into a flat option list. */
function collectOptions(children: React.ReactNode, into: Option[] = []): Option[] {
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === "optgroup") {
      collectOptions((child.props as { children?: React.ReactNode }).children, into);
      return;
    }
    if (child.type !== "option") return;
    const props = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean };
    const label = React.Children.toArray(props.children).join("");
    into.push({ value: props.value === undefined ? label : String(props.value), label, disabled: props.disabled });
  });
  return into;
}

/**
 * The workspace select. It presents the shadcn/Radix listbox while keeping a
 * hidden native `<select>` as the form value, so `register()`, refs and native
 * change handlers at the call sites keep working unchanged.
 */
function NativeSelect({ className, size = "default", children, value, defaultValue, onChange, disabled, name, ref, ...props }: NativeSelectProps) {
  const hidden = React.useRef<HTMLSelectElement | null>(null);
  const options = collectOptions(children);
  const [internal, setInternal] = React.useState(String(defaultValue ?? options[0]?.value ?? ""));
  const current = value !== undefined ? String(value) : internal;

  function commit(next: string) {
    const resolved = next === EMPTY ? "" : next;
    if (value === undefined) setInternal(resolved);
    const element = hidden.current;
    if (!element) return;
    // Setting through the prototype setter makes React see a real change.
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(element, resolved);
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  const selected = options.find((option) => option.value === current);

  return (
    <div className={cn("native-select", className)} data-slot="native-select-wrapper" data-size={size}>
      <select
        ref={(node) => {
          hidden.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        name={name}
        value={current}
        onChange={onChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="native-select-shadow"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Select value={current === "" ? EMPTY : current} onValueChange={commit} disabled={disabled}>
        <SelectTrigger
          data-slot="native-select"
          data-size={size}
          aria-label={props["aria-label"]}
          className="native-select-trigger"
        >
          <SelectValue>{selected?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value === "" ? EMPTY : option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NativeSelectOption({ className, ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" className={className} {...props} />;
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">) {
  return <optgroup data-slot="native-select-optgroup" className={className} {...props} />;
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
