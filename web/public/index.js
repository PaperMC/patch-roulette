let token = localStorage.getItem('token');
if (token) {
    onLogin();
}

function getUsername() {
    return atob(token).split(':')[0];
}

const loginForm = document.getElementById('login-form');
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const encoded = btoa(username + ":" + password);

    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + encoded
        }
    });

    if (response.ok) {
        localStorage.setItem('token', encoded);
        await onLogin();
    } else {
        alert("Invalid login.");
    }
});

async function onLogin() {
    document.getElementById('login-container').style.display = 'none';

    const contentContainer = document.getElementById('content-container');
    contentContainer.style.display = 'flex';

    document.getElementById('logged-user').innerText = getUsername();
}

document.getElementById('select-version').addEventListener('click', async () => {
    const mcVersion = document.getElementById('mcVersion').value;
    if (!mcVersion) {
        alert("Please enter a Minecraft version.");
        return;
    }

    const response = await fetch(`/get-available-patches?minecraftVersion=${mcVersion}`, {
        method: 'GET',
        headers: {
            'Authorization': 'Basic ' + localStorage.getItem('token')
        }
    });

    if (response.ok) {
        const patches = await response.json();
        const patchesList = document.getElementById('patches-list');
        patchesList.innerHTML = '';

        if (patches.length === 0) {
            patchesList.innerHTML = '<p class="text-gray-500 italic text-center py-4">No patches available for this version.</p>';
        } else {
            patches.forEach(patch => {
                const patchItem = document.createElement('div');
                patchItem.className = 'patch-item p-2 border-b border-gray-200';
                patchItem.innerText = patch;
                patchesList.appendChild(patchItem);
            });
        }

        document.getElementById('patches-container').classList.remove('hidden');
    } else {
        alert("Failed to fetch patches. Please try again.");
    }
});
