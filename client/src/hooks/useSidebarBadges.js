import { useState, useEffect, useCallback, useRef } from "react";
import api from "../API/axios";

const POLL_INTERVAL = 60000;

export default function useSidebarBadges() {
  const [badges, setBadges] = useState({
    pendingRequests: 0,
    offlineCancellations: 0,
    reissueRequests: 0,
    approvedRequests: 0,
  });
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchBadges = useCallback(async () => {
    try {
      const { data } = await api.get("/dashboard/sidebar-badges");
      if (mountedRef.current && data?.data) {
        setBadges(data.data);
      }
    } catch {
      // silently fail — badges are non-critical
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchBadges();
    intervalRef.current = setInterval(fetchBadges, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchBadges]);

  const refresh = useCallback(() => {
    fetchBadges();
  }, [fetchBadges]);

  return { badges, refresh };
}
