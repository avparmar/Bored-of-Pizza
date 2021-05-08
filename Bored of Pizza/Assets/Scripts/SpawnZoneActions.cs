using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class SpawnZoneActions : MonoBehaviour
{
    public GameObject Customer;
    public GameObject Canvas;

    private int count = 0;

    void Awake()
    {
        Application.targetFrameRate = 10;
    }

    // Start is called before the first frame update
    void Start()
    {
        
    }

    // Update is called once per frame
    void Update()
    {
        if (count > 50) 
        {
            count = 0;
            spawnCustomer();
        }
        else 
        {
            count++;
        }
    }

    private void spawnCustomer() 
    {
        GameObject customer = Instantiate(Customer, new Vector2(1895, 275 + (int)(Random.value * 11) * 50), Quaternion.identity);
        customer.transform.SetParent(Canvas.transform, true);
    }
}
