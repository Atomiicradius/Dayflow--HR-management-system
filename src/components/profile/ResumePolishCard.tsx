"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * `profiles` has no columns for a bio or skill tags (0001_init.sql), so this
 * card is intentionally local-only — nothing here survives a refresh. It
 * exists for visual polish per the original design doc; wiring it up for
 * real needs an additive migration the team hasn't agreed to yet.
 */
export function ResumePolishCard() {
  const [about, setAbout] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [draftSkill, setDraftSkill] = useState("");

  function addSkill() {
    const value = draftSkill.trim();
    if (!value || skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setDraftSkill("");
      return;
    }
    setSkills((prev) => [...prev, value]);
    setDraftSkill("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume</CardTitle>
        <CardDescription>
          Not saved yet — these fields have no column on `profiles` today.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="about">About</Label>
          <Textarea
            id="about"
            rows={3}
            placeholder="Tell your team a little about yourself"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Skills</Label>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1 py-1 pr-1.5 pl-2.5">
                {skill}
                <button
                  type="button"
                  onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                  aria-label={`Remove ${skill}`}
                  className="rounded-full p-0.5 hover:bg-black/10"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {skills.length === 0 && (
              <p className="text-sm text-muted-foreground">No skills added yet.</p>
            )}
          </div>
          <div className="mt-1 flex max-w-xs items-center gap-1.5">
            <Input
              value={draftSkill}
              onChange={(e) => setDraftSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              placeholder="Add a skill"
              className="h-8"
            />
            <button
              type="button"
              onClick={addSkill}
              disabled={!draftSkill.trim()}
              className="flex h-8 items-center gap-1 rounded-md border border-input px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
            >
              <Plus className="size-3.5" />
              Add
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
