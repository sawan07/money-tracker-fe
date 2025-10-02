document.getElementById("earningForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const month = document.getElementById("monthSelect").value;
    const success = await sendData("earning", formData, month);
    const msg = e.target.querySelector(".message");
    msg.textContent = success ? "Earning added ✅" : "Error ❌";
    msg.className = success ? "message success" : "message error";
    if (success) e.target.reset();
});
