const express = require('express');
const http = require('http');
const readline = require('readline');
const Joi = require('joi');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// Path to the JSON file
const blogsFilePath = path.join(__dirname, 'blogs.json');

// Function to read blogs from the file
function readBlogsFromFile() {
    try {
        const data = fs.readFileSync(blogsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading blogs from file:', err);
        return [];
    }
}

// Function to write blogs to the file
function writeBlogsToFile(blogs) {
    try {
        fs.writeFileSync(blogsFilePath, JSON.stringify(blogs, null, 2));
    } catch (err) {
        console.error('Error writing blogs to file:', err);
    }
}

// Load blogs from the JSON file
let blogs = readBlogsFromFile();
let lastId = blogs.length > 0 ? blogs[blogs.length - 1].id : 0;

// Express Routes
app.get('/', (req, res) => {
    res.send('Hey! This is the home page');
});

app.get('/api/blogs', (req, res) => {
    res.send(blogs);
});

app.get('/api/blogs/:id', (req, res) => {
    const blog = blogs.find(b => b.id === parseInt(req.params.id));
    if (!blog) res.status(404).send('The blog with the given ID not found!');
    else res.send(blog);
});

app.post('/api/blogs', (req, res) => {
    const { error } = validateBlog(req.body);
    if (error) {
        res.status(400).send(error.details[0].message);
    } else {
        lastId++;
        const newBlog = {
            id: lastId,
            blogContent: req.body.blogContent
        };
        blogs.push(newBlog);
        writeBlogsToFile(blogs);  // Write to the file after adding a blog
        res.send(newBlog);
    }
});

app.put('/api/blogs/:id', (req, res) => {
    const blog = blogs.find(b => b.id === parseInt(req.params.id));
    if (!blog) res.status(404).send('The blog with the given ID not found!');
    else {
        const { error } = validateBlog(req.body);
        if (error) {
            res.status(400).send(error.details[0].message);
        } else {
            blog.blogContent = req.body.blogContent;
            writeBlogsToFile(blogs);  // Write to the file after updating the blog
            res.send(blog);
        }
    }
});

app.delete('/api/blogs/:id', (req, res) => {
    const blog = blogs.find(b => b.id === parseInt(req.params.id));
    if (!blog) res.status(404).send('The blog with the given ID not found!');
    else {
        const index = blogs.indexOf(blog);
        blogs.splice(index, 1);
        writeBlogsToFile(blogs);  // Write to the file after deleting the blog
        res.send(blogs);
    }
});

function validateBlog(blog) {
    const schema = Joi.object({
        blogContent: Joi.string().min(5).required()
    });
    return schema.validate(blog);
}

// CLI Integration
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function handleCLI() {
    rl.question('Enter command (GET/POST/PUT/DELETE): ', (command) => {
        if (command.toUpperCase() === 'GET') {
            rl.question('Enter blog ID or leave blank for all: ', (id) => {
                if (id) getBlog(id);
                else getAllBlogs();
            });
        } else if (command.toUpperCase() === 'POST') {
            rl.question('Enter blog content: ', (blogContent) => {
                postBlog(blogContent);
            });
        } else if (command.toUpperCase() === 'PUT') {
            rl.question('Enter blog ID to update: ', (id) => {
                rl.question('Enter new blog content: ', (blogContent) => {
                    updateBlog(id, blogContent);
                });
            });
        } else if (command.toUpperCase() === 'DELETE') {
            rl.question('Enter blog ID to delete: ', (id) => {
                deleteBlog(id);
            });
        } else {
            console.log('Invalid command.');
        }
        rl.on('line', handleCLI);
    });
}

function getAllBlogs() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/blogs',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => console.log('Blogs:', JSON.parse(data)));
    });
    req.end();
}

function getBlog(id) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/blogs/${id}`,
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
            try {
                console.log('Blog:', JSON.parse(data));
            } catch (e) {
                console.error('Error parsing response:', e.message);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`Request error: ${e.message}`);
    });

    req.end();
}

function postBlog(blogContent) {
    const postData = JSON.stringify({ blogContent });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/blogs',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': postData.length
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => console.log('New Blog:', JSON.parse(data)));
    });
    req.write(postData);
    req.end();
}

function updateBlog(id, blogContent) {
    const putData = JSON.stringify({ blogContent });

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/blogs/${id}`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': putData.length
        }
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => console.log('Updated Blog:', JSON.parse(data)));
    });
    req.write(putData);
    req.end();
}

function deleteBlog(id) {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: `/api/blogs/${id}`,
        method: 'DELETE'
    };

    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => console.log('Remaining Blogs:', JSON.parse(data)));
    });
    req.end();
}

// Start the server
const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log('CLI ready. Enter commands below:');
    handleCLI();
});
