import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By

# Setup driver (e.g., Chrome)
driver = webdriver.Chrome()
url = "PASTE_ESPN_CRICINFO_GALLERY_URL_HERE"
driver.get(url)

# Scroll down to ensure all images load
driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
time.sleep(5)

# Create a folder to save images
os.makedirs('cricinfo_images', exist_ok=True)

# Find all image elements
images = driver.find_elements(By.TAG_NAME, 'img')

# Download the images
for i, img in enumerate(images):
    img_url = img.get_attribute('src')
    if img_url and 'http' in img_url:
        response = requests.get(img_url)
        if response.status_code == 200:
            with open(f'cricinfo_images/image_{i}.jpg', 'wb') as file:
                file.write(response.content)

driver.quit()
