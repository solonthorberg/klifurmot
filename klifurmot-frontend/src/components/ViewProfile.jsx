import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import PersonIcon from "@mui/icons-material/Person";

function ViewProfile({ me, onEdit }) {
  const formatDate = (dateString) => {
    if (!dateString) return "–";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatGender = (gender) => {
    if (!gender) return "–";
    return gender;
  };

  const formatNationality = (nationality) => {
    if (!nationality) return "–";
    return nationality;
  };

  const DisplayField = ({ children }) => (
    <Box
      sx={{
        border: "1px solid #c4c4c4",
        borderRadius: "4px",
        padding: "16.5px 14px",
        backgroundColor: "#f5f5f5",
        fontSize: "16px",
        fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
        color: "rgba(0, 0, 0, 0.87)",
        minHeight: "1.45em",
        lineHeight: "1.45em",
      }}
    >
      {children}
    </Box>
  );

  return (
    <Box maxWidth="sm" sx={{ mx: "auto" }}>
      <Avatar
        src={me.profile?.profile_picture || undefined}
        sx={{
          width: 150,
          height: 150,
          mx: "auto",
          mb: 2,
          bgcolor: "grey.300",
        }}
      >
        {!me.profile?.profile_picture && <PersonIcon sx={{ fontSize: 80 }} />}
      </Avatar>

      <Typography textAlign="center" variant="h5">
        Velkomin(n), {me.user.username}
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <FormControl fullWidth>
          <label>Fullt nafn</label>
          <DisplayField>{me.profile?.full_name || "–"}</DisplayField>
        </FormControl>

        <FormControl fullWidth>
          <label>Fæðingardagur</label>
          <DisplayField>{formatDate(me.profile?.date_of_birth)}</DisplayField>
        </FormControl>

        <FormControl fullWidth>
          <label>Kyn</label>
          <DisplayField>{formatGender(me.profile?.gender)}</DisplayField>
        </FormControl>

        <FormControl fullWidth>
          <label>Þjóðerni</label>
          <DisplayField>
            {formatNationality(me.profile?.nationality)}
          </DisplayField>
        </FormControl>

        <FormControl fullWidth>
          <label>Hæð (cm)</label>
          <DisplayField>
            {me.profile?.height_cm ? `${me.profile.height_cm} cm` : "–"}
          </DisplayField>
        </FormControl>

        <FormControl fullWidth>
          <label>Vænghaf (cm)</label>
          <DisplayField>
            {me.profile?.wingspan_cm ? `${me.profile.wingspan_cm} cm` : "–"}
          </DisplayField>
        </FormControl>

        <Box sx={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
          <Button variant="contained" onClick={onEdit}>
            Breyta
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

export default ViewProfile;
