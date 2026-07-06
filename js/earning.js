document.getElementById("earningForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const month = document.getElementById("monthSelect").value;
    const msg = e.target.querySelector(".message");

    startProgress();
    try {
        await sendData("earning", formData, month);
        finishProgress();
        msg.textContent = "Earning added ✅";
        msg.className = "message success";
        e.target.reset();
        fetchBalance(month);
        if (typeof loadHomeTransactions === "function") loadHomeTransactions();
    } catch (error) {
        finishProgress();
        msg.textContent = error.message || "Could not add earning";
        msg.className = "message error";
    }
});
