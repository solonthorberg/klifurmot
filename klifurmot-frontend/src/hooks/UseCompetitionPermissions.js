import { useState, useEffect } from "react";
import api from "../services/api";

export const UseCompetitionPermissions = (competitionId) => {
  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!competitionId) {
        setLoading(false);
        return;
      }

      try {
        const rolesResponse = await api.get(
          `/competitions/roles/?competition_id=${competitionId}`
        );

        const hasAdminRole = rolesResponse.data.some(
          (role) => role.role === "admin"
        );

        const editPermission = hasAdminRole;

        const deletePermission = hasAdminRole;

        setCanEdit(editPermission);
        setCanDelete(deletePermission);
      } catch (error) {
        console.error("Error checking permissions:", error);
        setCanEdit(false);
        setCanDelete(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [competitionId]);

  return { canEdit, canDelete, loading };
};
