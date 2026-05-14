function login() {

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  const username = usernameInput.value;
  const password = passwordInput.value;

  const btn = document.getElementById("login");
  const icon = document.getElementById("loginIcon");
  const text = document.getElementById("loginText");

  // disable inputs
  usernameInput.disabled = true;
  passwordInput.disabled = true;

  // START LOADING
  btn.disabled = true;
  icon.className = "fa fa-spinner fa-spin";
  text.textContent = "Logging in...";

  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ username, password })
  })
    .then(res => res.json())
    .then(data => {

      if (data.success) {

        localStorage.setItem("fullName", data.fullName);
        localStorage.setItem("accountType", data.accountType);
        localStorage.setItem("id", data.id);

        window.location.href = `/${data.username}/page/dashboard`;

      } else {

        alert("Invalid login");

        // RESET
        usernameInput.disabled = false;
        passwordInput.disabled = false;
        btn.disabled = false;
        icon.className = "fa fa-right-to-bracket";
        text.textContent = "Login";
      }

    })
    .catch(err => {
      console.error(err);

      // RESET
      usernameInput.disabled = false;
      passwordInput.disabled = false;
      btn.disabled = false;
      icon.className = "fa fa-right-to-bracket";
      text.textContent = "Login";
    });
}


document.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    login();
  }
});