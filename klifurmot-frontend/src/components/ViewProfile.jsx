import "./../css/pages/Profile.css";
import Button from "@mui/material/Button";

function ViewProfile({ me, onEdit }) {
  return (
    <div>
      <h2>Velkomin(n), {me.user.username}</h2>
      <p>Netfang: {me.user.email}</p>
      <p>Fullt nafn: {me.profile?.full_name || "–"}</p>
      <p>Fæðingardagur: {me.profile?.date_of_birth || "–"}</p>
      <p>Kyn: {me.profile?.gender || "–"}</p>
      <p>Þjóðerni: {me.profile?.nationality || "–"}</p>
      <p>Hæð: {me.profile?.height_cm || "–"} cm</p>
      <p>Vænghaf: {me.profile?.wingspan_cm || "–"} cm</p>

      <Button variant="contained" onClick={onEdit}>
        Breyta
      </Button>
    </div>
  );
}

export default ViewProfile;
