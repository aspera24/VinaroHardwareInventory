function login() {

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({
      username,
      password
    })
  })
    .then(res => res.json())
    .then(data => {

      if (data.success) {

        window.location.href =
          `/${data.username}/page/dashboard`;

      } else {

        alert("Invalid login");

      }

    });

}

function checkSession() {
  fetch("/check-session", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",

  })
    // .then(res => res.json())
    .then(res => {
      // alert(res.cookie.expires);
      
      if (res.admin != "") {
        window.location.href =
          `/${res.admin}/page/dashboard`;
      }
    });
}