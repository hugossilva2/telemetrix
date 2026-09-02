import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TripRecorder } from "@/components/trips/TripRecorder";
import { TelemetryProvider } from "@/components/telemetry/TelemetryProvider";
import { ObserverGate } from "@/components/layout/ObserverGate";
import { ModeOnboardingGate } from "@/components/layout/ModeOnboardingGate";
import { StudentGate } from "@/components/layout/StudentGate";
import { ActiveVehicleProvider } from "@/lib/vehicles/active";
import { AccountModeProvider } from "@/lib/account/profile";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => (
    <AccountModeProvider>
      <ActiveVehicleProvider>
        <TelemetryProvider>
          <ObserverGate />
          <ModeOnboardingGate />
          <StudentGate />
          <TripRecorder />
          <Outlet />
        </TelemetryProvider>
      </ActiveVehicleProvider>
    </AccountModeProvider>
  ),
});
