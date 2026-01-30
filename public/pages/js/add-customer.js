(function () {
    const loading = document.getElementById("loading");
    const main = document.querySelector(".main");
    main.style.display = "none"; // hide main while loading

    // show loading initially
    loading.style.display = "flex";

    $(document).ready(function () {
        let externalCustomers = [];

        $.ajax({
            type: 'GET',
            url: 'https://bplcapi.doitcebutech.com/borrower/all?is_active=1',
            success: function (res) {
                if (!res.isError) {
                    externalCustomers = res.data.map(v => ({
                        id: v.fullname,   // string id is OK
                        text: v.fullname
                    }));
                }
            }
        });


        $("#name").select2({
            placeholder: "Select or type customer...",
            allowClear: false,
            // tags: true,
            ajax: {
                url: "/page/customers",
                dataType: "json",
                delay: 250,
                data: function (params) {
                    return {
                        search: params.term || ""
                    };
                },
                processResults: function (data, params) {
                    const term = (params.term || "").toLowerCase();

                    // Filter external customers
                    const filteredExternal = externalCustomers.filter(c =>
                        c.text.toLowerCase().includes(term)
                    );

                    // Local DB customers (from API) - can filter as well or leave all
                    const apiCustomers = data.map(c => ({
                        id: c.id,
                        text: c.name,
                        contact: c.contact,
                        source: 'local'
                    }));

                    return {
                        results: [
                            ...filteredExternal,   // only matching external
                            ...apiCustomers        // can leave all or filter by term if you want
                        ]
                    };
                }
            },

            createTag: function (params) {
                const term = $.trim(params.term);

                if (term === "") return null;

                return {
                    id: term,
                    text: term,
                    newTag: true
                };
            }
        });

        // When customer selected, auto-fill contact
        $("#name").on("select2:select", function (e) {
            const data = e.params.data;
            if (data.contact) {
                $("#contact").val(data.contact);
            }
        });

    });


    document.getElementById("customerForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = {
            customer_id: $("#name").val() || null,
            name: $("#name option:selected").text() || $("#name").val(),
            contact: document.getElementById("contact").value,
            address: document.getElementById("address").value,
            email: document.getElementById("email").value,
            customer_type: document.getElementById("customer_type").value,
            notes: document.getElementById("notes").value,
            purpose: document.getElementById("purpose").value,
            date: document.getElementById("date").value,
            time: document.getElementById("time").value,
            meeting_mode: document.getElementById("meeting_mode").value,
            status: document.getElementById("status").value,
            appointment_note: document.getElementById("notes").value // optional
        };

        try {
            const res = await fetch("/page/add-customer-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (res.ok) {
                alert(result.message);
                document.getElementById("customerForm").reset();
            } else {
                alert(result.message || "Failed to save");
            }
        } catch (err) {
            console.error(err);
            // alert("Server error");return false;
        }

    });

    loading.style.display = "none";
    main.style.display = "block";

})();
