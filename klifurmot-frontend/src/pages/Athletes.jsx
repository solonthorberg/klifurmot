import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemButton from "@mui/material/ListItemButton";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";

function Athletes() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAthletes = async () => {
    try {
      const response = await api.get("athletes/climbers");
      // Only keep athletes with a user_account
      const filtered = response.data.filter((climber) => climber.user_account);
      setAthletes(filtered);
    } catch (error) {
      console.error("Error fetching athletes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAthletes();
  }, []);

  // Filter by search query
  const filteredAthletes = athletes.filter((climber) => {
    const fullName = climber.user_account.full_name || "";
    return fullName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: "center" }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Hleður inn keppendur...
        </Typography>
      </Container>
    );
  }

  return (
    <Box maxWidth="md" sx={{ mx: "auto", textAlign: "center" }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Keppendur
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Leita..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      {filteredAthletes.length === 0 ? (
        <Typography variant="body1" color="textSecondary" sx={{ mt: 3 }}>
          {searchQuery
            ? "Engir keppendur fundust."
            : "Engir keppendur skráðir."}
        </Typography>
      ) : (
        <List sx={{ bgcolor: "background.paper" }}>
          {filteredAthletes.map((climber) => {
            const { user_account } = climber;
            const nationality = user_account.nationality?.country_code || "";

            return (
              <ListItem
                key={climber.id}
                disablePadding
                sx={{ borderBottom: "1px solid #e0e0e0" }}
              >
                <ListItemButton
                  component={Link}
                  to={`/athletes/${user_account.id}`}
                  sx={{ py: 2 }}
                >
                  <ListItemText
                    primary={
                      <Typography variant="h6">
                        {user_account.full_name || "Nafn vantar"}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="body2" color="textSecondary">
                        {nationality} •{" "}
                        {user_account.age && user_account.age > 0
                          ? `${user_account.age} ára`
                          : "Aldur óþekktur"}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
}

export default Athletes;
