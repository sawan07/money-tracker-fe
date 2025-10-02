document.getElementById("expenseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const month = document.getElementById("monthSelect").value;

    await sendData("expense", formData, month);

    const msg = e.target.querySelector(".message");
    msg.textContent = "Expense added ✅";
    msg.className = "message success";
    e.target.reset();
});

