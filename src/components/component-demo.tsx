"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ComponentDemo() {
  const [name, setName] = useState("My first project");
  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [project, setProject] = useState("");
  const [createdProject, setCreatedProject] = useState("");

  return (
    <div className="grid items-start gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Project preferences</CardTitle>
          <CardDescription>A simple form, ready to connect to your app.</CardDescription>
        </CardHeader>
        <form onSubmit={(event) => { event.preventDefault(); setSaved(true); }} onChange={() => setSaved(false)}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter a project name" required maxLength={80} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="notifications">Email notifications</Label>
                <p id="notifications-description" className="text-xs text-muted-foreground">A demo preference for your project.</p>
              </div>
              <Switch id="notifications" checked={notifications} onCheckedChange={(checked) => { setNotifications(checked); setSaved(false); }} aria-describedby="notifications-description" />
            </div>
          </CardContent>
          <CardFooter className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={!name.trim()}>{saved ? <><Check /> Saved</> : "Save preferences"}</Button>
            <p role="status" className="text-xs text-muted-foreground">{saved ? "Saved for this session." : "Demo only. Resets on refresh."}</p>
          </CardFooter>
        </form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Component playground</CardTitle>
          <CardDescription>Buttons, badges, tabs, and a working dialog.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview">
            <TabsList className="mb-4"><TabsTrigger value="preview">Preview</TabsTrigger><TabsTrigger value="details">Details</TabsTrigger></TabsList>
            <TabsContent value="preview" className="space-y-5">
              <div className="flex flex-wrap gap-2"><Badge>Default</Badge><Badge variant="secondary">Secondary</Badge><Badge variant="outline">Outline</Badge></div>
              <p className="text-sm leading-6 text-muted-foreground">Start with a small set of components. Add more as your project grows.</p>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button variant="outline"><Plus />Create a project</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create a project</DialogTitle><DialogDescription>Try the dialog component. This demo keeps your project in memory for this session.</DialogDescription></DialogHeader>
                  <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (!project.trim()) return; setCreatedProject(project.trim()); setProject(""); setOpen(false); }}>
                    <div className="space-y-2"><Label htmlFor="new-project-name">Project name</Label><Input id="new-project-name" placeholder="My new project" value={project} onChange={(event) => setProject(event.target.value)} required maxLength={80} /></div>
                    <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={!project.trim()}>Create project</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <p role="status" className="break-words text-sm text-muted-foreground">{createdProject && `Created “${createdProject}” for this session.`}</p>
            </TabsContent>
            <TabsContent value="details" className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Components live in <code className="text-foreground">src/components/ui</code>. Edit them directly to suit your product.</p>
              <p>Theme colors are defined in <code className="text-foreground">src/app/globals.css</code>.</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
