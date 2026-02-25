import React from "react";

const ListingCard = ({ listing }) => {
  return (
    <div style={styles.card}>
      <h3>{listing.title}</h3>
      <p><b>Location:</b> {listing.location}</p>
      <p><b>Price:</b> ₹{listing.price}</p>
      <p><b>Type:</b> {listing.type}</p>
    </div>
  );
};

const styles = {
  card: {
    border: "1px solid #ccc",
    padding: "15px",
    marginBottom: "10px",
    borderRadius: "8px"
  }
};

export default ListingCard;