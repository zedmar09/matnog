"use client";

import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileUp } from "lucide-react";
import { useForm } from "react-hook-form";

import { ErrorSummary, type FieldError } from "@/shared/components/error-summary";
import { FormField } from "@/shared/components/form-field";
import { NoticePanel } from "@/shared/components/notice-panel";
import { SectionHeading } from "@/shared/components/section-heading";
import { Button } from "@/shared/components/ui/button";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { Textarea } from "@/shared/components/ui/textarea";
import type { RepositoryResult } from "@/shared/data/repository-result";

import { type FileReplacementValues, fileReplacementSchema } from "../schemas/document-schema";
import type { DocumentWorkspaceRecord } from "../types/document-routing";

const REPLACEMENT_FILES = ["readable-replacement.pdf", "corrected-attachment.pdf", "signed-copy.pdf"];

export function DocumentReplacementForm({
  onReplace,
}: {
  onReplace: (values: FileReplacementValues) => RepositoryResult<DocumentWorkspaceRecord>;
}) {
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors: fieldErrors },
  } = useForm<FileReplacementValues>({
    resolver: zodResolver(fileReplacementSchema),
    defaultValues: { filename: "", note: "" },
  });

  const submit = (values: FileReplacementValues) => {
    setErrors([]);
    setNotice("");
    const result = onReplace(values);
    if (result.kind === "invalid") {
      setErrors(result.errors);
      return;
    }
    if (result.kind !== "success") {
      setErrors([
        {
          id: "filename",
          message: result.kind === "denied" ? result.message : "The replacement could not be recorded.",
        },
      ]);
      return;
    }
    const current = result.data.versions.find((version) => version.id === result.data.document.currentFileVersionId);
    setNotice(`Revision ${current?.revision ?? result.data.versions.length} is now the routed file.`);
    reset();
  };

  return (
    <div className="document-replacement-form">
      <SectionHeading
        eyebrow="New immutable revision"
        title="Replace attachment"
        description="The current non-approved revision becomes superseded. Approved history remains unchanged."
      />
      <ErrorSummary errors={errors} title="Replacement needs attention" />
      {notice && <NoticePanel className="mt-4">{notice}</NoticePanel>}
      <form onSubmit={handleSubmit(submit)} noValidate>
        <FormField id="filename" label="Replacement file" error={fieldErrors.filename?.message}>
          {(field) => (
            <NativeSelect {...field} {...register("filename")}>
              <option value="">Choose a PDF document</option>
              {REPLACEMENT_FILES.map((filename) => (
                <option key={filename} value={filename}>
                  {filename}
                </option>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField id="note" label="Version note" error={fieldErrors.note?.message}>
          {(field) => <Textarea {...field} {...register("note")} />}
        </FormField>
        <Button type="submit">
          <FileUp />
          Add replacement revision
        </Button>
      </form>
    </div>
  );
}
