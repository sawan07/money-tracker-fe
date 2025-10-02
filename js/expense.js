document.getElementById("expenseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const month = document.getElementById("monthSelect").value;
    const success = await sendData("expense", formData, month);
    const msg = e.target.querySelector(".message");
    msg.textContent = success ? "Expense added ✅" : "Error ❌";
    msg.className = success ? "message success" : "message error";
    if (success) e.target.reset();
});
