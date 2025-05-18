import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css'; // Stil faylini import qilish

const API_BASE_URL = 'https://chsbserver.onrender.com/api'; // Backend asosiy manzili

function App() {
  // Foydalanuvchi ma'lumotlarini localStorage'dan yuklash.
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('chatUser');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("localStorage'dan foydalanuvchi ma'lumotlarini yuklashda xatolik:", error);
      return null;
    }
  });

  const [fullName, setFullName] = useState('');
  const [registrationError, setRegistrationError] = useState('');

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null); // Xabarlar ro'yxati oxiriga scroll qilish uchun ref (scrollIntoView uchun)
  const chatBoxRef = useRef(null); // Chat oynasining o'ziga murojaat qilish uchun ref (onScroll event uchun)

  // Scroll tugmasi holatini boshqarish
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Foydalanuvchini ro'yxatdan o'tkazish yoki tizimga kiritish funksiyasi
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setRegistrationError("Ism va familiya kiritilishi shart!");
      return;
    }
    try {
      const response = await axios.post(`${API_BASE_URL}/user/register`, { fullName });
      setUser(response.data);
      localStorage.setItem('chatUser', JSON.stringify(response.data));
      setFullName('');
      setRegistrationError('');
    } catch (error) {
      console.error("Ro'yxatdan o'tishda xatolik:", error);
      if (error.response && error.response.data && error.response.data.message) {
        setRegistrationError(error.response.data.message);
      } else {
        setRegistrationError("Ro'yxatdan o'tishda noma'lum xatolik yuz berdi.");
      }
    }
  };

  // Xabarlarni yuklash funksiyasi
  const fetchMessages = async () => {
    if (!user || !user.data || !user.data._id) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/message`);
      console.log('Yuklangan xabarlar:', response.data);
      if (Array.isArray(response.data)) {
        setMessages(response.data);
      } else {
        console.warn("Xabarlar massivi kutilgan formatda emas:", response.data);
        setMessages([]);
      }
    } catch (error) {
      console.error('Xabarlarni yuklashda xatolik:', error);
    }
  };

  // Chat oynasini eng pastga aylantirish funksiyasi
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Komponent yuklanganda va user o'zgarganda xabarlarni yuklash va boshlang'ich scroll
  useEffect(() => {
    if (user && user.data && user.data._id) {
      const initialFetchAndScroll = async () => {
        await fetchMessages(); // Xabarlarni yuklaymiz
        scrollToBottom(); // Va birinchi marta eng pastga tushiramiz
      };
      initialFetchAndScroll();

      // Har 3 sekundda xabarlarni yangilab turish uchun interval.
      const intervalId = setInterval(fetchMessages, 3000);
      return () => clearInterval(intervalId); // Komponent o'chirilganda intervalni tozalash
    }
  }, [user]); // user obyekti o'zgarganda (masalan, tizimga kirganda) qayta ishga tushadi

  // Yangi xabar kelganda yoki xabarlar ro'yxati o'zgarganda avtomatik pastga scroll qilish
  // FAQAT foydalanuvchi allaqachon pastda bo'lsa.
  useEffect(() => {
    if (chatBoxRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = chatBoxRef.current;
      // Agar foydalanuvchi pastki 50px ichida bo'lsa, avtomatik scroll qilamiz
      if (scrollHeight - scrollTop <= clientHeight + 50) {
        scrollToBottom();
      }
    }
  }, [messages]);

  // Chat oynasini aylantirish (scroll) hodisasini boshqarish
  const handleScroll = () => {
    if (chatBoxRef.current) {
      const { scrollHeight, scrollTop, clientHeight } = chatBoxRef.current;
      // Agar foydalanuvchi pastki 50px dan yuqoriga chiqqan bo'lsa, tugmani ko'rsatamiz
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 50;
      setShowScrollButton(!isAtBottom); // Pastda bo'lmasa tugmani ko'rsat
    }
  };

  // Xabar yuborish funksiyasi
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !user.data || !user.data._id) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/message`, {
        text: newMessage,
        userId: user.data._id,
      });
      console.log('Xabar yuborildi:', response.data);
      setNewMessage('');
      fetchMessages(); // Xabarlarni yangilab yuklash
    } catch (error) {
      console.error('Xabar yuborishda xatolik:', error);
      if (error.response) {
        console.error('Server javobi (data):', error.response.data);
      } else if (error.request) {
        console.error('So\'rov yuborildi, lekin javob olinmadi:', error.request);
      } else {
        console.error('So\'rovni sozlashda xatolik:', error.message);
      }
      alert("Xabar yuborishda xatolik yuz berdi! Iltimos, qayta urinib ko'ring.");
    }
  };

  // Xabarni o'chirish funksiyasi
  const handleDeleteMessage = async (messageId, senderId) => {
    if (!user || !user.data || user.data._id !== senderId) {
      alert("Faqat o'zingiz yuborgan xabarlarni o'chira olasiz.");
      return;
    }

    if (!window.confirm("Bu xabarni o'chirishni tasdiqlaysizmi?")) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/message/${messageId}`, {
        data: { userId: user.data._id }
      });
      console.log(`Xabar ${messageId} o'chirildi.`);
      fetchMessages();
    } catch (error) {
      console.error("Xabarni o'chirishda xatolik:", error);
      if (error.response && error.response.data && error.response.data.message) {
        alert("Xabarni o'chirishda xatolik: " + error.response.data.message);
      } else {
        alert("Xabarni o'chirishda noma'lum xatolik yuz berdi.");
      }
    }
  };

  // Tizimdan chiqish funksiyasi
  const handleLogout = () => {
    localStorage.removeItem('chatUser');
    setUser(null);
    setMessages([]);
    setShowScrollButton(false); // Logout bo'lganda tugmani yashirish
  };

  // Agar foydalanuvchi ro'yxatdan o'tmagan bo'lsa, ro'yxatdan o'tish formasini ko'rsatamiz
  if (!user || !user.data || !user.data._id) {
    return (
      <div className="app-container">
        <form onSubmit={handleRegister} className="registration-form">
          <h2>Chatga Xush Kelibsiz!</h2>
          <p>Davom etish uchun ism va familiyangizni kiriting:</p>
          <input
            type="text"
            placeholder="Ism Familiya"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          {registrationError && <p className="error-message">{registrationError}</p>}
          <button type="submit">Chatga Kirish</button>
        </form>
      </div>
    );
  }

  // Foydalanuvchi tizimga kirgan bo'lsa, chat interfeysini ko'rsatamiz
  return (
    <>
      <div className="navbar">
        <div className="navbar-innerbox">
          <div className="nav-right">
            <h1>Fizika va astronomiya</h1>
            <p>{user.data.fullName}</p>
          </div>
          <div className="nav-left">
            <button onClick={handleLogout} className="logout-button">Chiqish</button>
          </div>
        </div>
      </div>
      <div className="main">
        <div className="main-innerbox">
          <div className="main-top">
            <div className="mt-bold">16</div>
            <div className="mt-slim">(Q 2.8 ball)</div>
            <div className="mt-bold">Tebranish kuchi induktivligi 1mH bo'lgan g'altak va sig'imi 100 nF bo'lgan kondensatordan iborat. </div>
          </div>
          <div className="main-test">
            <div className="mt-slim">A 24</div>
            <div className="mt-slim">B 6.28</div>
            <div className="mt-slim">C 162.8</div>
            <div className="mt-slim">D 16</div>
          </div>
          <div className="main-btns">
            <button className="btn-clear">Tozalash</button>
            <button className="btn-e">E'tiroz yuborish</button>
          </div>
        </div>
      </div>
      <div className="footer">
        <div className="footer-innerbox">
          <div className="footer-top">
            {Array.from({ length: 50 }, (_, i) => (
              <div key={i + 1} className="test-el">{i + 1}</div>
            ))}
          </div>
          <div className="footer-bottom">
            <div className="fl">
              <button className="btn-b">Oldingi</button>
              <button className="btn-b">Keyingi</button>
            </div>
            <div className="fr">
              <button className="btn-e">Yakunlash</button>
            </div>
          </div>
        </div>
      </div>
      <div className="chat">
        <div className="chat-innerbox">
          {/* onScroll event'ini chat-box diviga qo'shamiz */}
          <div className="chat-box" ref={chatBoxRef} onScroll={handleScroll}>
            {Array.isArray(messages) && messages.map((msg) => (
              <div
                key={msg._id}
                className={`chat-el ${msg.sender && msg.sender._id === user.data._id ? 'own-message' : 'other-message'}`}
              >
                <div className="sender-name">
                  {msg.userName}
                </div>
                <div className="message-content">
                  <div className="message-text">{msg.text}</div>
                  <div className="message-time">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
                {msg.sender && msg.sender._id === user.data._id && (
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteMessage(msg._id, msg.sender._id)}
                    title="Xabarni o'chirish"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} /> {/* Scroll qilish uchun bo'sh div */}
          </div>

          {/* Scroll tugmasi, faqat showScrollButton true bo'lganda ko'rinadi */}


          <form onSubmit={handleSendMessage} className="chat-input">
            {showScrollButton && (
              <button id="scrl-btn" onClick={scrollToBottom} title="Eng pastga tushish">
                &#x2193; {/* Pastga strelka ikonkasi */}
              </button>
            )}




            <input
              type="text"
              placeholder="Xabar yozing..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={!user || !user.data || !user.data._id}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !user || !user.data || !user.data._id}
            >
              Yuborish
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export default App;
