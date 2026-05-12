import React from "react";

const ListingCard = ({ listing }) => {

return(

<div style={styles.card}>

<h3>{listing.title}</h3>

<p><b>Area:</b> {listing.area}</p>

<p><b>Rent:</b> ₹{listing.rent}</p>

<p><b>Type:</b> {listing.type}</p>

</div>

);

};

const styles = {

card:{
border:"1px solid #ccc",
padding:"15px",
marginBottom:"10px",
borderRadius:"8px"
}

};

export default ListingCard;