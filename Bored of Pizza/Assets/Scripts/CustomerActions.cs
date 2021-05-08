using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class CustomerActions : MonoBehaviour
{
    public GameObject Customer;
    
    private float dest;
    private int count = 0;

    void Awake()
    {
        Application.targetFrameRate = 10;
    }

    // Start is called before the first frame update
    void Start()
    {
        dest = transform.position.x - 50 - Random.value * 500;
    }

    // Update is called once per frame
    void Update()
    {
        moveTo(dest, transform.position.y);
    }

    public void moveTo(float x, float y) 
    {
        if (transform.position.x > x) 
        {
            if (count == 5)
            {
                count = 0;
                transform.position = new Vector2(transform.position.x - 50f, transform.position.y);
            }
            else 
            {
                count++;
            }
        }


    }
}
