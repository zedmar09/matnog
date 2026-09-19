"use client";

import { useState } from "react";

import { Laptop, Settings2 } from "lucide-react";

import { ContentPanel, PanelDivider } from "@/shared/components/content-panel";
import { SectionHeading } from "@/shared/components/section-heading";
import { StatusBadge } from "@/shared/components/status-badge";
import { Button } from "@/shared/components/ui/button";

export function AccountPreferencesPanel() {
  const [language, setLanguage] = useState("English");
  const [reading, setReading] = useState("Standard");
  const [notices, setNotices] = useState(true);

  return (
    <ContentPanel as="section" className="account-preferences-panel">
      <SectionHeading
        eyebrow="Preferences and session"
        title="Finish the sample profile"
        description="These choices remain in this page only. Translated content and notification delivery are not connected."
      />
      <div className="account-preferences-grid">
        <div>
          <label>
            Preferred language
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option>English</option>
              <option>Filipino</option>
              <option>Bikol</option>
            </select>
          </label>
          <label>
            Reading preference
            <select value={reading} onChange={(event) => setReading(event.target.value)}>
              <option>Standard</option>
              <option>Plain-language prompts</option>
              <option>Reduced motion</option>
            </select>
          </label>
          <label className="registry-toggle">
            <input type="checkbox" checked={notices} onChange={(event) => setNotices(event.target.checked)} />
            Show local service reminders
          </label>
          <p className="small-note" role="status">
            Saved locally for this page: {language}, {reading.toLowerCase()}, reminders {notices ? "on" : "off"}.
          </p>
        </div>
        <div>
          <div className="account-session-heading">
            <Laptop />
            <div>
              <strong>This browser session</strong>
              <span>Phone-verified demo · active now</span>
            </div>
            <StatusBadge tone="success">Current</StatusBadge>
          </div>
          <PanelDivider />
          <dl className="registry-facts">
            <div>
              <dt>Signed in with</dt>
              <dd>Demo phone challenge</dd>
            </div>
            <div>
              <dt>Remembered devices</dt>
              <dd>None</dd>
            </div>
            <div>
              <dt>Session storage</dt>
              <dd>Fixed account marker only</dd>
            </div>
          </dl>
          <Button variant="outline" disabled>
            <Settings2 />
            No other sample sessions to end
          </Button>
        </div>
      </div>
    </ContentPanel>
  );
}
