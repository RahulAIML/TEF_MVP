"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signupUser } from "@/services/api";
import { setAuthToken } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signupUser({ email, password });
      setAuthToken(result.access_token);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="TEF Reading Trainer" subtitle="Create your account" />
      <main className="container py-10">
        <Card className="mx-auto max-w-md border-slate-200 shadow-soft">
          <CardHeader>
            <CardTitle className="text-slate-900">Sign Up</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-rose-700">{error}</p>}
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
              <p className="text-sm text-slate-500">
                Already have an account?{" "}
                <button
                  type="button"
                  className="font-medium text-slate-700 hover:text-slate-900"
                  onClick={() => router.push("/login")}
                >
                  Log in
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
