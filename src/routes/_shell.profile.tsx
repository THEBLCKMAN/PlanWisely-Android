import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/nav";
import { Field, PrimaryButton, SelectField } from "@/components/ui";
import { useApp } from "@/store/app-store";
import { getInitials } from "@/lib/supabase";
import { pwHead } from "@/lib/head";

export const Route = createFileRoute("/_shell/profile")({
  head: () => pwHead("Profile — PlanWisely", "Manage your personal profile."),
  component: ProfilePage,
});
function ProfilePage() {
  const { user, updateUser, uploadAvatar } = useApp();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);
  const [university, setUniversity] = useState(user.university);
  const [studentNumber, setStudentNumber] = useState(user.studentNumber);
  const [year, setYear] = useState(user.year);
  const [nsfas, setNsfas] = useState(user.nsfasRecipient);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setName(user.name);
    setPhone(user.phone);
    setUniversity(user.university);
    setStudentNumber(user.studentNumber);
    setYear(user.year);
    setNsfas(user.nsfasRecipient);
  }, [user]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateUser({
        name: name.trim(),
        phone: phone.trim(),
        university: university.trim(),
        studentNumber: studentNumber.trim(),
        year,
        nsfasRecipient: nsfas,
      });
      toast.success("Profile saved.");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setBusy(false);
    }
  };
  const choosePhoto = async (file?: File) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      await uploadAvatar(file);
      toast.success("Profile photo updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload photo.");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  return (
    <Page className="min-h-dvh">
      <PageHeader title="Profile" backTo="/dashboard" />
      <div className="mb-5 flex flex-col items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-navy text-2xl font-extrabold text-navy-foreground shadow-soft"
          aria-label="Add or change profile photo"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            getInitials(user.name)
          )}
          <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary text-white">
            <Camera size={15} />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => void choosePhoto(e.target.files?.[0])}
        />
        <span className="text-xs text-muted-foreground">
          {photoBusy ? "Uploading photo…" : "Tap to add a profile photo"}
        </span>
        <h2 className="mt-1 text-lg font-bold text-foreground">{user.name || "Your profile"}</h2>
      </div>
      <div className="mb-3 flex justify-end">
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-navy-foreground"
          >
            Edit info
          </button>
        )}
      </div>
      <fieldset disabled={!editing} className="disabled:opacity-80">
        <form onSubmit={save} className="space-y-4 rounded-3xl bg-card p-4 shadow-soft">
          <Field label="Full name" value={name} onChange={setName} placeholder="Your full name" />
          <Field
            label="Email"
            value={user.email}
            onChange={() => {}}
            type="email"
            placeholder="Email"
            disabled
          />
          <Field
            label="Phone"
            value={phone}
            onChange={setPhone}
            placeholder="Add your phone number"
            type="tel"
          />
          <Field
            label="University"
            value={university}
            onChange={setUniversity}
            placeholder="Add your university"
          />
          <Field
            label="Student number"
            value={studentNumber}
            onChange={setStudentNumber}
            placeholder="Add your student number"
          />
          <SelectField
            label="Year of study"
            value={year}
            onChange={setYear}
            placeholder="Select year"
            options={[
              { value: "1st year", label: "1st year" },
              { value: "2nd year", label: "2nd year" },
              { value: "3rd year", label: "3rd year" },
              { value: "4th year", label: "4th year" },
              { value: "Postgraduate", label: "Postgraduate" },
            ]}
          />
          <label className="flex items-center gap-3 rounded-2xl bg-background p-3 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              checked={nsfas}
              onChange={(e) => setNsfas(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            I receive NSFAS funding
          </label>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-2xl border border-border p-3 font-semibold"
                onClick={() => {
                  setName(user.name);
                  setPhone(user.phone);
                  setUniversity(user.university);
                  setStudentNumber(user.studentNumber);
                  setYear(user.year);
                  setNsfas(user.nsfasRecipient);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </PrimaryButton>
            </div>
          )}
        </form>
      </fieldset>
    </Page>
  );
}
