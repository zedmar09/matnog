import { PageHeader } from "@/shared/components/page-header";
export function CreditsView() {
  return (
    <div className="site-container page-content reading-page">
      <PageHeader
        title="Credits & acknowledgments"
        description="The people and open-source work behind this preview."
      />
      <section className="content-panel">
        <h2>Subic Beach photography</h2>
        <p>
          “Subic Beach” by FrincesEzra, via Wikimedia Commons. Licensed under{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="inline-link">
            Creative Commons Attribution-ShareAlike 4.0
          </a>
          . The photograph is displayed with responsive cropping; the source file is unchanged.
        </p>
        <a href="https://commons.wikimedia.org/wiki/File:Subic_Beach.jpg" className="inline-link">
          View the original photograph and attribution
        </a>
      </section>
      <section className="content-panel">
        <h2>Interface foundation</h2>
        <p>
          Adapted from the supplied next-shadcn-admin-dashboard-main template, copyright © 2024 Mohammed Arham Khan,
          under the MIT License. The original license is retained in the project.
        </p>
        <p>Built with Next.js, React, shadcn/ui, Tailwind CSS, Refine, Lucide icons, and Geist typography.</p>
      </section>
    </div>
  );
}
