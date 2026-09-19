import { Check, Circle } from "lucide-react";

export type TimelineStep = {
  title: string;
  detail: string;
  complete: boolean;
};

/**
 * Ordered progress of a request. Completed steps carry an icon as well as a
 * colour so progress is not communicated by colour alone.
 */
export function Timeline({ steps }: { steps: readonly TimelineStep[] }) {
  return (
    <ol className="timeline">
      {steps.map((step) => (
        <li key={step.title}>
          <div className="timeline-marker" data-complete={step.complete}>
            <span>
              {step.complete ? <Check size={13} /> : <Circle size={8} />}
              <span className="sr-only">{step.complete ? "Completed:" : "Not yet started:"}</span>
            </span>
          </div>
          <div>
            <strong>{step.title}</strong>
            <p>{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
