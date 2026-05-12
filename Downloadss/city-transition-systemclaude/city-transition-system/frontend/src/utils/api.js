const BASE_URL = "http://localhost:30008/api/auth";

// Register User
export async function registerUser(name, email, password, role) {

  const res = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      email,
      password,
      role
    })
  });

  const data = await res.json();

  return {
    status: res.status,
    data: data
  };
}

// Login User
export async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  const data = await res.json();
  return data;
}