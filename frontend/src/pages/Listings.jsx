import React,{useState,useEffect} from "react";
import ListingCard from "../components/ListingCard";

const Listings = ()=>{

const [listings,setListings] = useState([]);

const [filters,setFilters] = useState({

minPrice:"",
maxPrice:"",
type:""

});

const fetchListings = async ()=>{

const query = new URLSearchParams(filters).toString();

const res = await fetch(`http://localhost:30008/api/listings?${query}`);

const data = await res.json();

setListings(data);

};

useEffect(()=>{

fetchListings();

},[]);

return(

<div>

<h2>Listings</h2>

<input
placeholder="Min Price"
onChange={(e)=>setFilters({...filters,minPrice:e.target.value})}
/>

<input
placeholder="Max Price"
onChange={(e)=>setFilters({...filters,maxPrice:e.target.value})}
/>

<select
onChange={(e)=>setFilters({...filters,type:e.target.value})}
>

<option value="">All</option>
<option value="PG">PG</option>
<option value="Hostel">Hostel</option>
<option value="House">House</option>

</select>

<button onClick={fetchListings}>
Search
</button>

{listings.map(l=>(

<ListingCard key={l._id} listing={l}/>

))}

</div>

);

};

export default Listings;