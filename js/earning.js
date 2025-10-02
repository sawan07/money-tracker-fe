document.getElementById("earningForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const month = document.getElementById("monthSelect").value;

    await sendData("earning", formData, month);

    const msg = e.target.querySelector(".message");
    msg.textContent = "Earning added ✅";
    msg.className = "message success";
    e.target.reset();
});
